import { useState, useEffect, useRef } from 'react';
import { GameRoomDoc } from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import {
  createInitialMemoryMatchState,
  flipMemoryCard,
  getSmartMemoryBotMove,
  MemoryMatchState,
  resolveMemoryMismatch,
} from '../../games/memoryMatchLogic';

interface MemoryMatchArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  restartTrigger?: number;
  onScoreUpdate: (scores: { you: number; partner: number }) => void;
  onGameOver: (headline: string, subline: string) => void;
}

export function MemoryMatchArena({
  room,
  restartTrigger = 0,
  onScoreUpdate,
  onGameOver,
}: MemoryMatchArenaProps) {
  const [state, setState] = useState<MemoryMatchState>(() => createInitialMemoryMatchState());
  const [playMode, setPlayMode] = useState<'solo' | 'twoPlayer'>(room ? 'twoPlayer' : 'solo');
  const [isBotFlipping, setIsBotFlipping] = useState(false);
  const [botMemory, setBotMemory] = useState<Map<number, string>>(() => new Map());
  const [wins, setWins] = useState<{ you: number; partner: number }>({ you: 0, partner: 0 });

  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onGameOverRef.current = onGameOver;
  });

  useEffect(() => {
    if (restartTrigger > 0) {
      handleReset();
    }
  }, [restartTrigger]);

  useEffect(() => {
    onScoreUpdateRef.current(wins);
  }, [wins]);

  useEffect(() => {
    if (state.winner !== null) {
      gameAudio.playWinFanfare();
      if (state.winner === 0) {
        setWins((w) => ({ ...w, you: w.you + 1 }));
        onGameOverRef.current('Memory Match Master! You Win!', `You discovered ${state.scores[0]} couple keepsakes!`);
      } else if (state.winner === 1) {
        setWins((w) => ({ ...w, partner: w.partner + 1 }));
        onGameOverRef.current('Nkanyezi Found More Pairs!', `She remembered ${state.scores[1]} keepsake cards!`);
      } else {
        onGameOverRef.current('Perfect Keepsake Bond!', 'An even 4-to-4 tie finding sweet memories!');
      }
    }
  }, [state.winner]);

  // Handle mismatch delayed turn flip
  useEffect(() => {
    if (state.isResolvingMismatch) {
      const timer = setTimeout(() => {
        setState((prev) => resolveMemoryMismatch(prev));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.isResolvingMismatch]);

  // Track cards seen for Bot Memory
  useEffect(() => {
    if (state.flippedIndices.length > 0) {
      setBotMemory((prev) => {
        const next = new Map(prev);
        for (const idx of state.flippedIndices) {
          next.set(idx, state.cards[idx].symbolKey);
        }
        return next;
      });
    }
  }, [state.flippedIndices, state.cards]);

  // Bot Turn in Solo Mode
  useEffect(() => {
    if (
      playMode === 'solo' &&
      state.turnSeat === 1 &&
      state.winner === null &&
      !state.isResolvingMismatch &&
      !isBotFlipping
    ) {
      setIsBotFlipping(true);
      const timer = setTimeout(() => {
        const botPick = getSmartMemoryBotMove(state, botMemory);
        handleCardClick(botPick, true);
        setIsBotFlipping(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [state.turnSeat, state.winner, state.isResolvingMismatch, playMode, isBotFlipping, state.flippedIndices, botMemory]);

  const handleReset = () => {
    setState(createInitialMemoryMatchState());
    setBotMemory(new Map());
  };

  const handleCardClick = (index: number, isBot = false) => {
    if (state.winner !== null || state.isResolvingMismatch) return;
    if (!isBot && playMode === 'solo' && state.turnSeat === 1) return;

    gameAudio.playCardDraw();
    const { nextState, isMatch } = flipMemoryCard(state, index);
    if (isMatch) {
      gameAudio.playWinFanfare();
    }
    setState(nextState);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-start gap-5 py-2 px-3 text-[#FFF7FA]">
      {/* Mode Selector & Score Counters */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#1B2A22] border border-[#2D4537] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlayMode('solo');
              handleReset();
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              playMode === 'solo'
                ? 'bg-[#10B981] text-white shadow-md'
                : 'bg-[#111C16] text-[#A7C0B2] hover:text-white'
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
                ? 'bg-[#10B981] text-white shadow-md'
                : 'bg-[#111C16] text-[#A7C0B2] hover:text-white'
            }`}
          >
            Two Players (Pass & Play)
          </button>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#38BDF8]" />
            <span>You: <strong className="text-white font-mono">{state.scores[0]}</strong> pairs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FDA4AF]" />
            <span>Nkanyezi: <strong className="text-white font-mono">{state.scores[1]}</strong> pairs</span>
          </div>
        </div>
      </div>

      {/* Action Event Notice */}
      <div className="w-full bg-[#122018] border border-[#253D2F] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-serif text-[#A7F3D0]">
        <span>{state.lastAction}</span>
        <span className="text-[10px] font-mono text-[#6EE7B7]">
          Pairs Remaining: {8 - (state.scores[0] + state.scores[1])}
        </span>
      </div>

      {/* Velvet Baize Card Table Surface (4x4 Grid) */}
      <div className="w-full max-w-[500px] aspect-square rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-[#0F3925] via-[#092618] to-[#051A10] border-[8px] sm:border-[12px] border-[#291711] shadow-2xl relative select-none">
        {/* Brass corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#EAB308]/60" />

        {/* 16 Cards 4x4 Grid */}
        <div className="grid grid-cols-4 grid-rows-4 w-full h-full gap-2 sm:gap-3">
          {state.cards.map((card, idx) => {
            const isFlipped = state.flippedIndices.includes(idx);
            const isMatched = state.matchedIndices.includes(idx);
            const isRevealed = isFlipped || isMatched;

            return (
              <button
                key={`mem-card-${card.id}-${idx}`}
                type="button"
                disabled={isRevealed || state.isResolvingMismatch || (playMode === 'solo' && state.turnSeat === 1)}
                onClick={() => handleCardClick(idx)}
                aria-label={isRevealed ? card.name : `Flip card ${idx + 1}`}
                className={`relative rounded-2xl flex items-center justify-center transition-all transform duration-300 shadow-md ${
                  isRevealed
                    ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-2 border-[#38BDF8] rotate-0'
                    : 'bg-gradient-to-br from-[#881337] via-[#9F1239] to-[#4C0519] border-2 border-[#FDA4AF]/50 hover:scale-105 cursor-pointer'
                } ${isMatched ? 'opacity-85 ring-2 ring-[#10B981]' : ''}`}
              >
                {/* Revealed Face */}
                {isRevealed && (
                  <div className="flex flex-col items-center justify-center p-1 animate-scale-in">
                    <span className="text-2xl sm:text-3xl select-none mb-1 drop-shadow-md">
                      {card.symbol}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-center text-[#F1F5F9] leading-tight line-clamp-1">
                      {card.name}
                    </span>
                  </div>
                )}

                {/* Face Down Deck Filigree Back */}
                {!isRevealed && (
                  <div className="flex flex-col items-center justify-center text-[#FDE68A]/70 select-none">
                    <span className="text-lg sm:text-xl">★</span>
                    <span className="text-[8px] font-mono tracking-widest uppercase">KEEPSAKE</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Restart Button */}
      <button
        type="button"
        onClick={handleReset}
        className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1C2C23] hover:bg-[#283E32] border border-[#3E5C4B] text-xs font-bold text-[#E2F0E7] transition-colors"
      >
        Reshuffle Keepsake Cards
      </button>
    </div>
  );
}
