import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trophy, Star, AlertCircle, CheckCircle2, Play, Maximize, Minimize, Bomb, Volume2, VolumeX } from 'lucide-react';

// ── Sound ────────────────────────────────────────────────────────────────────
const createSoundManager = () => {
  let audioCtx: AudioContext | null = null;
  const getCtx = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
  };
  const playTone = (freq: number, type: OscillatorType, duration: number, volume = 0.1) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };
  return {
    spin: () => playTone(150, 'sine', 0.1, 0.05),
    correct: () => { playTone(523.25, 'sine', 0.3, 0.1); setTimeout(() => playTone(659.25, 'sine', 0.4, 0.1), 100); },
    incorrect: () => { playTone(220, 'triangle', 0.3, 0.1); setTimeout(() => playTone(164.81, 'triangle', 0.5, 0.1), 150); },
  };
};
const soundManager = createSoundManager();

// ── Types ────────────────────────────────────────────────────────────────────
type SpellingCategory = 'au' | 'ou' | 'ei' | 'ij';
type Category = SpellingCategory | 'bom';

interface Word { text: string; gap: string; answer: SpellingCategory; }
interface Player {
  id: number; name: string; score: number; color: string; avatar: string;
  lastScoreChange?: number; lastScoreAmount?: number;
  totalQuestions: number; correctAnswers: number;
  history: { word: Word; isCorrect: boolean; userAnswer: SpellingCategory }[];
}

// ── Data ─────────────────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFD93D', '#A29BFE', '#FAB1A0'];
const AVATARS = ['🦊','🐱','🐶','🦁','🐯','🐼','🐨','🐸','🐵','🦄','🐝','🦋','🦉','🐢','🐘','🦒'];

const WORDS: Record<SpellingCategory, Word[]> = {
  au: [
    { text: '..to', gap: '..', answer: 'au' }, { text: '..la', gap: '..', answer: 'au' },
    { text: '..teur', gap: '..', answer: 'au' }, { text: 'p..ze', gap: '..', answer: 'au' },
    { text: 'p..w', gap: '..', answer: 'au' }, { text: 'bl..w', gap: '..', answer: 'au' },
    { text: 'r..w vlees', gap: '..', answer: 'au' }, { text: 'g..w', gap: '..', answer: 'au' },
    { text: 'fl..w', gap: '..', answer: 'au' }, { text: 'kl..w', gap: '..', answer: 'au' },
    { text: 'gr..w', gap: '..', answer: 'au' }, { text: 'n..w', gap: '..', answer: 'au' },
    { text: 'd..w', gap: '..', answer: 'au' }, { text: 'k..wen', gap: '..', answer: 'au' },
    { text: 's..s', gap: '..', answer: 'au' }, { text: 's..span', gap: '..', answer: 'au' },
  ],
  ou: [
    { text: 'b..wen', gap: '..', answer: 'ou' }, { text: 'h..den', gap: '..', answer: 'ou' },
    { text: 'tr..wen', gap: '..', answer: 'ou' }, { text: 'vr..w', gap: '..', answer: 'ou' },
    { text: 't..w', gap: '..', answer: 'ou' }, { text: 'm..w', gap: '..', answer: 'ou' },
    { text: 'sch..w', gap: '..', answer: 'ou' }, { text: 'k..s', gap: '..', answer: 'ou' },
    { text: 'k..', gap: '..', answer: 'ou' }, { text: 'j..', gap: '..', answer: 'ou' },
    { text: 'n..', gap: '..', answer: 'ou' }, { text: 'z..', gap: '..', answer: 'ou' },
    { text: 'g..d', gap: '..', answer: 'ou' }, { text: 'k..d', gap: '..', answer: 'ou' },
    { text: 'f..t', gap: '..', answer: 'ou' }, { text: 'z..t', gap: '..', answer: 'ou' },
    { text: 'h..t', gap: '..', answer: 'ou' }, { text: 'sch..der', gap: '..', answer: 'ou' },
    { text: 'geb..w', gap: '..', answer: 'ou' }, { text: 'b..wvak', gap: '..', answer: 'ou' },
    { text: 'h..tskool', gap: '..', answer: 'ou' }, { text: 'h..tblok', gap: '..', answer: 'ou' },
  ],
  ei: [
    { text: '..', gap: '..', answer: 'ei' }, { text: 'kl..n', gap: '..', answer: 'ei' },
    { text: 'tr..n', gap: '..', answer: 'ei' }, { text: 'pl..n', gap: '..', answer: 'ei' },
    { text: 'g..t', gap: '..', answer: 'ei' }, { text: 'm..d', gap: '..', answer: 'ei' },
    { text: 'z..l', gap: '..', answer: 'ei' }, { text: 'v..l', gap: '..', answer: 'ei' },
    { text: 'br..n', gap: '..', answer: 'ei' }, { text: 'r..n', gap: '..', answer: 'ei' },
    { text: 'sch..d', gap: '..', answer: 'ei' }, { text: 'h..lig', gap: '..', answer: 'ei' },
    { text: 'geh..m', gap: '..', answer: 'ei' }, { text: 'k..zer', gap: '..', answer: 'ei' },
    { text: 'waterp..l', gap: '..', answer: 'ei' },
  ],
  ij: [
    { text: '..s', gap: '..', answer: 'ij' }, { text: '..zer', gap: '..', answer: 'ij' },
    { text: '..skoud', gap: '..', answer: 'ij' }, { text: 't..d', gap: '..', answer: 'ij' },
    { text: 'l..n', gap: '..', answer: 'ij' }, { text: 'p..n', gap: '..', answer: 'ij' },
    { text: 'w..zen', gap: '..', answer: 'ij' }, { text: 'pr..zen', gap: '..', answer: 'ij' },
    { text: 'kr..gen', gap: '..', answer: 'ij' }, { text: 'schr..ven', gap: '..', answer: 'ij' },
    { text: 'bl..ven', gap: '..', answer: 'ij' }, { text: 'k..ken', gap: '..', answer: 'ij' },
    { text: 'bl..ken', gap: '..', answer: 'ij' }, { text: 'r..st', gap: '..', answer: 'ij' },
    { text: 'r..m', gap: '..', answer: 'ij' }, { text: 'r..den', gap: '..', answer: 'ij' },
    { text: 'l..st', gap: '..', answer: 'ij' }, { text: 'kr..t', gap: '..', answer: 'ij' },
  ],
};

// ── Wheel ─────────────────────────────────────────────────────────────────────
const WHEEL_SECTIONS = [
  { label: 'AU',  color: '#FF6B6B', textColor: '#fff', category: 'au'  as Category },
  { label: 'OU',  color: '#4ECDC4', textColor: '#fff', category: 'ou'  as Category },
  { label: 'EI',  color: '#45B7D1', textColor: '#fff', category: 'ei'  as Category },
  { label: 'IJ',  color: '#96CEB4', textColor: '#fff', category: 'ij'  as Category },
  { label: '💣',  color: '#2a2a2a', textColor: '#fff', category: 'bom' as Category },
];

function SpinWheel({ rotation }: { rotation: number }) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const n = WHEEL_SECTIONS.length;

  const sections = WHEEL_SECTIONS.map((sec, i) => {
    const startAngle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = r * 0.65;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    return { ...sec, path, lx, ly, midAngle };
  });

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Pointer */}
      <div style={{
        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0, zIndex: 10,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderTop: '24px solid #141414',
      }} />
      <motion.svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        animate={{ rotate: rotation }}
        transition={{ duration: 3, ease: [0.45, 0.05, 0.55, 0.95] }}
        style={{ borderRadius: '50%', border: '5px solid #141414', display: 'block',
          boxShadow: '5px 5px 0px #141414' }}
      >
        {sections.map((sec, i) => (
          <g key={i}>
            <path d={sec.path} fill={sec.color} stroke="#141414" strokeWidth="1.5" />
            <text
              x={sec.lx} y={sec.ly}
              textAnchor="middle" dominantBaseline="central"
              fill={sec.textColor}
              fontSize={sec.label === '💣' ? 22 : 18}
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {sec.label}
            </text>
          </g>
        ))}
        {/* Center pin */}
        <circle cx={cx} cy={cy} r={12} fill="white" stroke="#141414" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={5} fill="#141414" />
      </motion.svg>
    </div>
  );
}

// ── Word display ──────────────────────────────────────────────────────────────
function WordDisplay({ word, showAnswer }: { word: Word; showAnswer: boolean }) {
  const parts = word.text.split('..');
  return (
    <span style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-2px' }}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{
              color: '#FF6B6B', borderBottom: '5px solid #FF6B6B',
              minWidth: '1.5ch', display: 'inline-block', textAlign: 'center', margin: '0 4px'
            }}>
              {showAnswer ? word.answer : '??'}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

// ── Answer buttons ────────────────────────────────────────────────────────────
function AnswerButtons({ category, word, onAnswer }: {
  category: Category; word: Word; onAnswer: (a: SpellingCategory) => void
}) {
  const isAuOu = category === 'au' || category === 'ou' ||
    (category === 'bom' && (word.answer === 'au' || word.answer === 'ou'));
  const btnStyle = (color: string): React.CSSProperties => ({
    flex: 1, padding: '1.2rem', borderRadius: 16, fontSize: '2rem', fontWeight: 900,
    border: '4px solid #141414', color: 'white', cursor: 'pointer', background: color,
    boxShadow: '5px 5px 0px #141414', transition: 'all 0.1s',
  });
  return (
    <div style={{ display: 'flex', gap: 16, width: '100%' }}>
      {isAuOu ? (
        <>
          <button style={btnStyle('#FF6B6B')} onClick={() => onAnswer('au')}>AU</button>
          <button style={btnStyle('#4ECDC4')} onClick={() => onAnswer('ou')}>OU</button>
        </>
      ) : (
        <>
          <button style={btnStyle('#45B7D1')} onClick={() => onAnswer('ei')}>EI</button>
          <button style={btnStyle('#96CEB4')} onClick={() => onAnswer('ij')}>IJ</button>
        </>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory' | 'summary' | 'practice'>('menu');
  const [menuStep, setMenuStep] = useState<'count' | 'names'>('count');
  const [tempPlayerCount, setTempPlayerCount] = useState(1);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [practicePlayerId, setPracticePlayerId] = useState<number | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswered, setPracticeAnswered] = useState(false);
  const [practiceUserAnswer, setPracticeUserAnswer] = useState<SpellingCategory | null>(null);
  const [practiceWords, setPracticeWords] = useState<{ word: Word; isCorrect: boolean; userAnswer: SpellingCategory }[]>([]);
  const wordDecks = useRef<Record<SpellingCategory, Word[]>>({ au: [], ou: [], ei: [], ij: [] });
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [gameDuration, setGameDuration] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playSound = useCallback((type: 'spin' | 'correct' | 'incorrect') => {
    if (soundEnabled) soundManager[type]();
  }, [soundEnabled]);

  const startGame = (names: string[]) => {
    const shuffledAvatars = [...AVATARS].sort(() => Math.random() - 0.5);
    const newPlayers = names.map((name, i) => ({
      id: i,
      name: name.trim() || (isTeamMode ? `Team ${String.fromCharCode(65 + i)}` : `Speler ${i + 1}`),
      score: 0,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      avatar: shuffledAvatars[i % shuffledAvatars.length],
      totalQuestions: 0, correctAnswers: 0, history: [],
    }));
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameState('playing');
    setRotation(0);
    setShowQuestion(false);
    setFeedback(null);
    setStartTime(Date.now());
    setGameDuration(null);
  };

  const handlePlayerCountSelect = (count: number, isTeam = false) => {
    setTempPlayerCount(count);
    setIsTeamMode(isTeam);
    setCustomNames(Array(count).fill(''));
    setMenuStep('names');
  };

  const getWordFromDeck = (cat: SpellingCategory): Word => {
    let deck = [...wordDecks.current[cat]];
    if (deck.length === 0) deck = [...WORDS[cat]].sort(() => Math.random() - 0.5);
    const word = deck.pop()!;
    wordDecks.current[cat] = deck;
    return word;
  };

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowQuestion(false);
    setFeedback(null);
    const extraSpins = 5 + Math.random() * 5;
    const newRotation = rotation + extraSpins * 360;
    setRotation(newRotation);
    const spinInterval = setInterval(() => playSound('spin'), 150);
    setTimeout(() => {
      clearInterval(spinInterval);
      setIsSpinning(false);
      const n = WHEEL_SECTIONS.length;
      const normalized = ((newRotation % 360) + 360) % 360;
      // pointer is at top (270°). sections start at -90° (top) going clockwise.
      const sectionAngle = 360 / n;
      const sectionIndex = Math.floor(((360 - normalized) % 360) / sectionAngle) % n;
      const category = WHEEL_SECTIONS[sectionIndex].category;
      let word: Word;
      if (category === 'bom') {
        const cats: SpellingCategory[] = ['au', 'ou', 'ei', 'ij'];
        word = getWordFromDeck(cats[Math.floor(Math.random() * cats.length)]);
      } else if (category === 'au' || category === 'ou') {
        word = getWordFromDeck(Math.random() < 0.5 ? 'au' : 'ou');
      } else {
        word = getWordFromDeck(Math.random() < 0.5 ? 'ei' : 'ij');
      }
      setCurrentCategory(category);
      setCurrentWord(word);
      setShowQuestion(true);
    }, 3000);
  };

  const handleAnswer = (answer: SpellingCategory) => {
    if (!currentWord || feedback) return;
    const isCorrect = answer === currentWord.answer;
    const updated = [...players];
    const p = updated[currentPlayerIndex];
    p.totalQuestions += 1;
    if (isCorrect) p.correctAnswers += 1;
    p.history.push({ word: currentWord, isCorrect, userAnswer: answer });

    if (isCorrect) {
      playSound('correct');
      p.score += 10;
      p.lastScoreChange = Date.now();
      p.lastScoreAmount = 10;
      setPlayers(updated);
      const idx = currentPlayerIndex;
      setTimeout(() => setPlayers(prev => prev.map((x, i) => i === idx ? { ...x, lastScoreChange: undefined, lastScoreAmount: undefined } : x)), 2000);
      setFeedback({ type: 'success', message: 'Goed gedaan! 🌟' });
      if (p.score >= 100) {
        if (startTime) setGameDuration(Math.floor((Date.now() - startTime) / 1000));
        setTimeout(() => setGameState(updated.length <= 2 ? 'summary' : 'victory'), 1500);
      }
    } else {
      playSound('incorrect');
      if (currentCategory === 'bom') {
        p.score = Math.max(0, p.score - 20);
        p.lastScoreChange = Date.now();
        p.lastScoreAmount = -20;
        setPlayers(updated);
        const idx = currentPlayerIndex;
        setTimeout(() => setPlayers(prev => prev.map((x, i) => i === idx ? { ...x, lastScoreChange: undefined, lastScoreAmount: undefined } : x)), 2000);
        setFeedback({ type: 'error', message: `BOEM! -20 punten. Het was ${currentWord.answer.toUpperCase()}.` });
      } else {
        setPlayers(updated);
        setFeedback({ type: 'error', message: `Helaas, het was ${currentWord.answer.toUpperCase()}.` });
      }
    }
    setTimeout(() => {
      setShowQuestion(false);
      setFeedback(null);
      setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
    }, 2000);
  };

  const resetGame = () => {
    setGameState('menu'); setMenuStep('count'); setPlayers([]);
    setCurrentPlayerIndex(0); setPracticePlayerId(null);
    setPracticeIndex(0); setPracticeAnswered(false);
    setPracticeUserAnswer(null); setPracticeWords([]);
  };

  const startPractice = (playerId: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setPracticeWords(player.history.filter(h => !h.isCorrect));
    setPracticePlayerId(playerId);
    setPracticeIndex(0); setPracticeAnswered(false); setPracticeUserAnswer(null);
    setGameState('practice');
  };

  const handlePracticeAnswer = (answer: SpellingCategory) => {
    if (practiceAnswered || practicePlayerId === null || practiceWords.length === 0) return;
    setPracticeUserAnswer(answer);
    setPracticeAnswered(true);
    playSound(answer === practiceWords[practiceIndex].word.answer ? 'correct' : 'incorrect');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'white', border: '6px solid #141414', borderRadius: 40,
    boxShadow: '12px 12px 0px #141414', padding: '2.5rem',
  };
  const btn = (bg = '#FFD93D', color = '#141414'): React.CSSProperties => ({
    background: bg, color, border: '4px solid #141414', borderRadius: 20,
    padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
    boxShadow: '6px 6px 0px #141414', letterSpacing: '0.05em', textTransform: 'uppercase',
    transition: 'all 0.1s',
  });
  const smallBtn: React.CSSProperties = {
    background: 'white', border: '2px solid #141414', borderRadius: 12,
    padding: '0.6rem', cursor: 'pointer', boxShadow: '3px 3px 0px #141414',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (gameState === 'menu') {
    return (
      <div style={{ minHeight: '100vh', background: '#FDFCF0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...card, maxWidth: 700, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: '#FFD93D', border: '4px solid #141414', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '4px 4px 0 #141414' }}>
            <Trophy size={36} />
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,7vw,4rem)', fontWeight: 900, margin: '0 0 0.5rem', letterSpacing: '-2px', textTransform: 'uppercase' }}>Weetwoorden Rad</h1>
          <p style={{ opacity: 0.5, fontWeight: 700, marginBottom: '2rem' }}>Race naar 100 punten! 🏁</p>

          {menuStep === 'count' ? (
            <>
              <p style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: '1rem' }}>Individueel</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
                {[1,2,3,4].map(n => (
                  <button key={n} onClick={() => handlePlayerCountSelect(n)} style={{ ...btn(), padding: '1.2rem 0.5rem' }}>
                    <div style={{ fontSize: '2rem' }}>{n}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{n === 1 ? 'Speler' : 'Spelers'}</div>
                  </button>
                ))}
              </div>
              <p style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: '1rem' }}>Teams</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
                {[2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => handlePlayerCountSelect(n, true)} style={{ ...btn('#4ECDC4'), padding: '1.2rem 0.5rem' }}>
                    <div style={{ fontSize: '2rem' }}>{n}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Teams</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <h2 style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Voer namen in</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.5rem' }}>
                {customNames.map((name, i) => (
                  <input key={i} type="text" value={name}
                    onChange={e => { const n = [...customNames]; n[i] = e.target.value; setCustomNames(n); }}
                    placeholder={isTeamMode ? `Team ${String.fromCharCode(65+i)}` : `Speler ${i+1}`}
                    style={{ border: '4px solid #141414', borderRadius: 16, padding: '0.8rem 1rem', fontSize: '1.1rem', fontWeight: 700, background: '#FDFCF0', outline: 'none' }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setMenuStep('count')} style={{ ...btn('white'), flex: 1 }}>Terug</button>
                <button onClick={() => startGame(customNames)} style={{ ...btn(), flex: 2 }}>Start Spel!</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── VICTORY ───────────────────────────────────────────────────────────────
  if (gameState === 'victory') {
    const winner = [...players].sort((a, b) => b.score - a.score)[0];
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#FFD93D', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, fontFamily: 'system-ui, sans-serif' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...card, textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 80, marginBottom: '1rem' }}>{winner.avatar}</div>
          <h1 style={{ fontSize: 'clamp(2rem,8vw,4rem)', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 0.5rem', letterSpacing: '-2px' }}>{winner.name} Wint!</h1>
          {gameDuration && <p style={{ color: '#FF6B6B', fontWeight: 900, fontSize: '1.5rem' }}>Tijd: {Math.floor(gameDuration/60)}m {gameDuration%60}s</p>}
          <p style={{ opacity: 0.5, fontWeight: 700, marginBottom: '2rem' }}>Echte spelling-kampioen! 🏆</p>
          <button onClick={resetGame} style={{ ...btn('#141414', 'white'), width: '100%' }}>Terug naar Menu</button>
        </motion.div>
      </div>
    );
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (gameState === 'summary') {
    return (
      <div style={{ minHeight: '100vh', background: '#FDFCF0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 800, width: '100%' }}>
          <h1 style={{ textAlign: 'center', fontSize: 'clamp(2rem,6vw,3.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-2px', marginBottom: '0.5rem' }}>Spel Overzicht</h1>
          <p style={{ textAlign: 'center', opacity: 0.5, fontWeight: 700, marginBottom: '2rem' }}>Geweldig gespeeld!</p>
          <div style={{ display: 'grid', gridTemplateColumns: players.length === 2 ? '1fr 1fr' : '1fr', gap: 24 }}>
            {players.map(player => {
              const pct = player.totalQuestions > 0 ? Math.round(player.correctAnswers / player.totalQuestions * 100) : 0;
              return (
                <div key={player.id} style={{ ...card, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1rem' }}>
                    <span style={{ fontSize: 40 }}>{player.avatar}</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.5rem' }}>{player.name}</div>
                      <div style={{ opacity: 0.5, fontWeight: 700 }}>Score: {player.score}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, marginBottom: 8 }}>
                    <span>{pct}% Goed</span>
                    <span>{player.correctAnswers} / {player.totalQuestions}</span>
                  </div>
                  <button onClick={() => startPractice(player.id)} style={{ width: '100%', height: 40, background: '#f5f5f0', border: '3px solid #141414', borderRadius: 12, overflow: 'hidden', position: 'relative', cursor: 'pointer', marginBottom: 8 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: '#C1FFD7', transition: 'width 1s' }} />
                    <span style={{ position: 'relative', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Klik om fouten te oefenen 🎯</span>
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#C1FFD7', border: '2px solid #141414', borderRadius: 12, padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.5rem' }}>{player.correctAnswers}</div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, fontWeight: 700 }}>Goed</div>
                    </div>
                    <div style={{ background: '#FFC1C1', border: '2px solid #141414', borderRadius: 12, padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.5rem' }}>{player.totalQuestions - player.correctAnswers}</div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, fontWeight: 700 }}>Fout</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button onClick={resetGame} style={{ ...btn('#141414', 'white') }}>Terug naar Menu</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PRACTICE ──────────────────────────────────────────────────────────────
  if (gameState === 'practice' && practicePlayerId !== null) {
    const player = players[practicePlayerId];
    const pw = practiceWords[practiceIndex];
    return (
      <div style={{ minHeight: '100vh', background: '#FDFCF0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 36 }}>{player.avatar}</span>
              <span style={{ fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase' }}>Oefenen: {player.name}</span>
            </div>
            <button onClick={() => setGameState('summary')} style={{ ...btn('#141414', 'white'), padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Sluiten</button>
          </div>
          {practiceWords.length > 0 ? (
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ opacity: 0.4, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                Vraag {practiceIndex + 1} van {practiceWords.length}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <WordDisplay word={pw.word} showAnswer={practiceAnswered && practiceUserAnswer === pw.word.answer} />
              </div>
              {!practiceAnswered ? (
                <AnswerButtons category={pw.word.answer === 'au' || pw.word.answer === 'ou' ? 'au' : 'ei'} word={pw.word} onAnswer={handlePracticeAnswer} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                    style={{ padding: '1rem', borderRadius: 16, border: '3px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: practiceUserAnswer === pw.word.answer ? '#C1FFD7' : '#FFC1C1' }}>
                    {practiceUserAnswer === pw.word.answer ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                    <span style={{ fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase' }}>
                      {practiceUserAnswer === pw.word.answer ? 'Goed gedaan!' : 'Helaas!'}
                    </span>
                  </motion.div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {practiceUserAnswer !== pw.word.answer ? (
                      <button onClick={() => { setPracticeAnswered(false); setPracticeUserAnswer(null); }} style={{ ...btn(), flex: 1 }}>Probeer opnieuw</button>
                    ) : (
                      <>
                        <button disabled={practiceIndex === 0} onClick={() => { setPracticeIndex(p => p - 1); setPracticeAnswered(false); setPracticeUserAnswer(null); }} style={{ ...btn('white'), flex: 1, opacity: practiceIndex === 0 ? 0.3 : 1 }}>Vorige</button>
                        <button onClick={() => { if (practiceIndex < practiceWords.length - 1) { setPracticeIndex(p => p + 1); setPracticeAnswered(false); setPracticeUserAnswer(null); } else setGameState('summary'); }} style={{ ...btn(), flex: 1 }}>
                          {practiceIndex < practiceWords.length - 1 ? 'Volgende' : 'Klaar!'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.4, fontWeight: 700, fontSize: '1.2rem' }}>
              Geen fouten om te oefenen! Super gedaan! 🎉
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  const currentPlayer = players[currentPlayerIndex];
  return (
    <div style={{ height: '100vh', background: '#FDFCF0', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {players.map((player, i) => (
            <motion.div key={player.id}
              animate={{ scale: i === currentPlayerIndex ? 1.05 : 1, opacity: i === currentPlayerIndex ? 1 : 0.6 }}
              style={{ background: 'white', border: `${i === currentPlayerIndex ? 3 : 2}px solid ${i === currentPlayerIndex ? player.color : '#141414'}`, borderRadius: 14, padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '3px 3px 0 #141414', position: 'relative' }}>
              <span style={{ fontSize: 20 }}>{player.avatar}</span>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>{player.name}</div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1 }}>{player.score}</div>
              </div>
              <AnimatePresence>
                {player.lastScoreAmount !== undefined && (
                  <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: player.lastScoreAmount > 0 ? -30 : 30 }} exit={{ opacity: 0 }}
                    style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontWeight: 900, fontSize: '1.2rem', color: player.lastScoreAmount > 0 ? '#4ECDC4' : '#FF6B6B', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                    {player.lastScoreAmount > 0 ? `+${player.lastScoreAmount}` : player.lastScoreAmount}
                  </motion.div>
                )}
              </AnimatePresence>
              {i === currentPlayerIndex && (
                <div style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, background: '#141414', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={10} fill="#FFD93D" color="#FFD93D" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={smallBtn} onClick={toggleFullscreen}><Maximize size={18} /></button>
          <button style={smallBtn} onClick={resetGame}><RotateCcw size={18} /></button>
          <button style={smallBtn} onClick={() => setSoundEnabled(s => !s)}>{soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, padding: '0 2rem', flexWrap: 'wrap' }}>
        {/* Wheel */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <SpinWheel rotation={rotation} />
          <button
            onClick={spinWheel}
            disabled={isSpinning || showQuestion}
            style={{
              ...btn(isSpinning || showQuestion ? '#e0e0e0' : '#FFD93D', isSpinning || showQuestion ? '#999' : '#141414'),
              width: 300, fontSize: '1.3rem', cursor: isSpinning || showQuestion ? 'not-allowed' : 'pointer',
            }}
          >
            {isSpinning ? 'Draaien...' : 'Draai het rad!'}
          </button>
        </div>

        {/* Question area */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            {showQuestion && currentWord ? (
              <motion.div key="question" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ ...card, width: '100%', textAlign: 'center', borderColor: currentPlayer.color }}>
                <div style={{ marginBottom: '0.5rem', opacity: 0.5, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {currentPlayer.name} is aan de beurt
                  {currentCategory === 'bom' && <span style={{ color: '#FF6B6B', marginLeft: 8 }}>⚠️ BOM! (-20 bij fout)</span>}
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <WordDisplay word={currentWord} showAnswer={!!feedback} />
                </div>
                {!feedback ? (
                  <AnswerButtons category={currentCategory!} word={currentWord} onAnswer={handleAnswer} />
                ) : (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                    style={{ padding: '1rem 1.5rem', borderRadius: 16, border: '3px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: feedback.type === 'success' ? '#C1FFD7' : '#FFC1C1' }}>
                    {feedback.type === 'success' ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                    <span style={{ fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase' }}>{feedback.message}</span>
                  </motion.div>
                )}
              </motion.div>
            ) : isSpinning ? (
              <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, border: '6px solid #141414', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', opacity: 0.4 }}>Spannend...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: 'white', border: '4px solid #141414', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '4px 4px 0 #141414' }}>
                  <Play size={32} fill="#141414" />
                </div>
                <p style={{ fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', opacity: 0.3 }}>{currentPlayer.name} is aan de beurt</p>
                <p style={{ fontWeight: 700, opacity: 0.3 }}>Draai aan het rad!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

