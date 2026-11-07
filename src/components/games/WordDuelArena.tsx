import { useState, useEffect, useRef } from 'react';
import { GameRoomDoc } from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import {
  calculateWordScore,
  createInitialWordDuelState,
  findAllWordsOnBoard,
  isValidBogglePath,
  submitWordDuelWord,
  WordDuelState,
} from '../../games/wordDuelLogic';

interface WordDuelArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  restartTrigger?: number;
  onScoreUpdate: (scores: { you: number; partner: number }) => void;
  onGameOver: (headline: string, subline: string) => void;
}

const ROUND_TIME_SEC = 90;

export function WordDuelArena({
  room,
  restartTrigger = 0,
  onScoreUpdate,
  onGameOver,
}: WordDuelArenaProps) {
  const [state, setState] = useState<WordDuelState>(() => createInitialWordDuelState());
  const [playMode, setPlayMode] = useState<'solo' | 'twoPlayer'>(room ? 'twoPlayer' : 'solo');
  const [activePath, setActivePath] = useState<[number, number][]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_TIME_SEC);
  const [timerRunning, setTimerRunning] = useState<boolean>(true);
  const [possibleWords, setPossibleWords] = useState<string[]>([]);

  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onGameOverRef.current = onGameOver;
  });

  // Calculate all board words once per board
  useEffect(() => {
    const words = findAllWordsOnBoard(state.board);
    setPossibleWords(words);
  }, [state.board]);

  useEffect(() => {
    if (restartTrigger > 0) {
      handleReset();
    }
  }, [restartTrigger]);

  useEffect(() => {
    onScoreUpdateRef.current({ you: state.scores[0], partner: state.scores[1] });
  }, [state.scores]);

  // 90s Duel Countdown Timer
  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimerRunning(false);
          handleTimeExpired();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  // Bot Word Discovery in Solo Mode
  useEffect(() => {
    if (playMode !== 'solo' || !timerRunning || possibleWords.length === 0) return;
    // Every 8-12 seconds, Nkanyezi discovers a word
    const delay = 7000 + Math.random() * 5000;
    const timer = setTimeout(() => {
      const p1Words = state.foundWords[1] ?? [];
      const unpicked = possibleWords.filter((w) => !p1Words.includes(w));
      if (unpicked.length > 0) {
        // Pick random word
        const word = unpicked[Math.floor(Math.random() * unpicked.length)];
        const sub = submitWordDuelWord(state, word, 1);
        if (sub.success) {
          gameAudio.playCardSnap();
          setState(sub.nextState);
        }
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [playMode, timerRunning, possibleWords, state]);

  const handleTimeExpired = () => {
    gameAudio.playWinFanfare();
    if (state.scores[0] > state.scores[1]) {
      onGameOverRef.current('Word Duel Victory!', `You outscored with ${state.scores[0]} pts against ${state.scores[1]} pts!`);
    } else if (state.scores[1] > state.scores[0]) {
      onGameOverRef.current('Nkanyezi Won Word Duel!', `Her vocabulary scored ${state.scores[1]} pts!`);
    } else {
      onGameOverRef.current('Vocabulary Tie!', `An incredible ${state.scores[0]} to ${state.scores[0]} word showdown!`);
    }
  };

  const handleReset = () => {
    setState(createInitialWordDuelState());
    setActivePath([]);
    setTimeLeft(ROUND_TIME_SEC);
    setTimerRunning(true);
  };

  const handleLetterClick = (r: number, c: number) => {
    // If clicking last letter in path, remove it (backtrack)
    if (activePath.length > 0) {
      const [lastR, lastC] = activePath[activePath.length - 1];
      if (lastR === r && lastC === c) {
        setActivePath((p) => p.slice(0, -1));
        return;
      }
    }

    // Already in path? Ignore
    if (activePath.some(([pr, pc]) => pr === r && pc === c)) {
      return;
    }

    // Must be adjacent to last letter if path > 0
    if (activePath.length > 0) {
      const [lastR, lastC] = activePath[activePath.length - 1];
      const dr = Math.abs(r - lastR);
      const dc = Math.abs(c - lastC);
      if (dr > 1 || dc > 1) return; // Not adjacent
    }

    gameAudio.playTilePlace(true);
    setActivePath((prev) => [...prev, [r, c]]);
  };

  const currentWord = activePath.map(([r, c]) => state.board[r][c]).join('');
  const currentPoints = calculateWordScore(currentWord);

  const handleSubmitCurrentWord = () => {
    if (currentWord.length < 3) return;
    const sub = submitWordDuelWord(state, currentWord, 0);
    if (sub.success) {
      gameAudio.playCapture();
    } else {
      gameAudio.playTilePlace(false);
    }
    setState(sub.nextState);
    setActivePath([]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-start gap-5 py-2 px-3 text-[#FFF7FA]">
      {/* Mode Selector & Timer Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#24171E] border border-[#3E2533] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlayMode('solo');
              handleReset();
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              playMode === 'solo'
                ? 'bg-[#E11D48] text-white shadow-md'
                : 'bg-[#1D1218] text-[#CBB2BD] hover:text-white'
            }`}
          >
            Solo vs. Nkanyezi
          </button>
          <button
            type="button"
            onClick={() => {
              setPlayMode('twoPlayer');
              handleReset();
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              playMode === 'twoPlayer'
                ? 'bg-[#E11D48] text-white shadow-md'
                : 'bg-[#1D1218] text-[#CBB2BD] hover:text-white'
            }`}
          >
            Two Players (Pass & Play)
          </button>
        </div>

        {/* 90-Second Timer */}
        <div className="flex items-center gap-2 font-mono text-xs font-bold">
          <span className="text-[#CBB2BD]">TIME:</span>
          <span
            className={`px-3 py-1 rounded-xl text-sm ${
              timeLeft <= 15 ? 'bg-[#E11D48] text-white animate-pulse' : 'bg-[#170E14] text-[#FDE68A]'
            }`}
          >
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Action Event Notice */}
      <div className="w-full bg-[#1C1117] border border-[#3A202E] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-serif text-[#FDE68A]">
        <span>{state.lastAction}</span>
        <span className="text-[10px] font-mono text-[#E2B7C8]">
          You: <strong>{state.scores[0]} pts</strong> | Nkanyezi: <strong>{state.scores[1]} pts</strong>
        </span>
      </div>

      {/* Boggle Letter Dice Tray (4x4 Grid) */}
      <div className="w-full max-w-[420px] aspect-square rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-[#3E2419] via-[#2F1A12] to-[#1F100B] border-[8px] sm:border-[12px] border-[#522E1F] shadow-2xl relative select-none">
        {/* Brass corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#EAB308]/60" />

        {/* 4x4 Dice Grid */}
        <div className="grid grid-cols-4 grid-rows-4 w-full h-full gap-2 sm:gap-3 bg-[#150A05] p-2.5 sm:p-3 rounded-2xl shadow-inner border border-[#3E2317]">
          {state.board.map((row, r) =>
            row.map((letter, c) => {
              const pathIdx = activePath.findIndex(([pr, pc]) => pr === r && pc === c);
              const isSelected = pathIdx !== -1;
              const isLast = isSelected && pathIdx === activePath.length - 1;

              return (
                <button
                  key={`die-${r}-${c}`}
                  type="button"
                  onClick={() => handleLetterClick(r, c)}
                  className={`relative rounded-2xl flex flex-col items-center justify-center font-serif font-black text-2xl sm:text-3xl transition-all shadow-md transform ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#E11D48] to-[#9F1239] text-white border-2 border-[#FDA4AF] scale-105 shadow-rose-900/50'
                      : 'bg-gradient-to-br from-[#FAF5EE] via-[#F3ECE0] to-[#E5DAC8] text-[#1E293B] border-2 border-[#B45309]/30 hover:scale-102 hover:border-[#B45309]'
                  } ${isLast ? 'ring-4 ring-[#FDE68A]' : ''}`}
                >
                  <span>{letter}</span>
                  {isSelected && (
                    <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold text-[#FDE68A]">
                      {pathIdx + 1}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Word Composition Bar */}
      <div className="w-full max-w-[420px] bg-[#22131C] border border-[#3F2232] p-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#A68694] font-mono uppercase tracking-wider">
            Current Word
          </span>
          <span className="font-serif font-black text-lg tracking-wider text-[#FDE68A]">
            {currentWord || <span className="text-[#59394A] italic">Tap adjacent letters</span>}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activePath.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePath([])}
              className="min-h-[38px] px-3 rounded-xl bg-[#2E1825] hover:bg-[#3D2031] text-xs font-semibold text-[#CBA2B4]"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            disabled={currentWord.length < 3}
            onClick={handleSubmitCurrentWord}
            className={`min-h-[38px] px-4 rounded-xl text-xs font-bold transition-all shadow-md ${
              currentWord.length >= 3
                ? 'bg-gradient-to-r from-[#E11D48] to-[#BE123C] text-white hover:brightness-110'
                : 'bg-[#311C28] text-[#694859] cursor-not-allowed'
            }`}
          >
            Submit (+{currentPoints} pts)
          </button>
        </div>
      </div>

      {/* Discovered Words Lists */}
      <div className="w-full max-w-[420px] grid grid-cols-2 gap-3 text-xs">
        {/* Your Words */}
        <div className="bg-[#170E14] border border-[#301B27] p-2.5 rounded-xl flex flex-col gap-1 max-h-36 overflow-y-auto">
          <span className="font-bold text-[#38BDF8] text-[10px] uppercase font-mono">
            Your Words ({state.foundWords[0]?.length ?? 0})
          </span>
          <div className="flex flex-wrap gap-1">
            {(state.foundWords[0] ?? []).map((w, i) => (
              <span
                key={`my-w-${i}`}
                className="px-2 py-0.5 rounded bg-[#251722] text-[#F3DCE4] font-mono text-[11px]"
              >
                {w} <span className="text-[#FDE68A]">+{calculateWordScore(w)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Nkanyezi's Words */}
        <div className="bg-[#170E14] border border-[#301B27] p-2.5 rounded-xl flex flex-col gap-1 max-h-36 overflow-y-auto">
          <span className="font-bold text-[#FDA4AF] text-[10px] uppercase font-mono">
            Nkanyezi ({state.foundWords[1]?.length ?? 0})
          </span>
          <div className="flex flex-wrap gap-1">
            {(state.foundWords[1] ?? []).map((w, i) => (
              <span
                key={`p1-w-${i}`}
                className="px-2 py-0.5 rounded bg-[#251722] text-[#F3DCE4] font-mono text-[11px]"
              >
                {w} <span className="text-[#FDE68A]">+{calculateWordScore(w)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Restart Button */}
      <button
        type="button"
        onClick={handleReset}
        className="min-h-[42px] px-5 py-2 rounded-xl bg-[#2C1924] hover:bg-[#3D2332] border border-[#522F43] text-xs font-bold text-[#F3DCE4] transition-colors"
      >
        Shake Letter Dice Tray
      </button>
    </div>
  );
}
