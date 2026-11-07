import { useState, useEffect, useRef } from 'react';
import { GameRoomDoc } from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import {
  createInitialMancalaState,
  getSmartMancalaBotMove,
  isPitPlayable,
  MancalaState,
  P0_PITS,
  P0_STORE,
  P1_PITS,
  P1_STORE,
  playMancalaMove,
} from '../../games/mancalaLogic';

interface MancalaArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  restartTrigger?: number;
  onScoreUpdate: (scores: { you: number; partner: number }) => void;
  onGameOver: (headline: string, subline: string) => void;
}

const GEM_COLORS = ['#38BDF8', '#F43F5E', '#FBBF24', '#34D399', '#A855F7', '#FB923C'];

export function MancalaArena({
  room,
  restartTrigger = 0,
  onScoreUpdate,
  onGameOver,
}: MancalaArenaProps) {
  const [state, setState] = useState<MancalaState>(() => createInitialMancalaState());
  const [playMode, setPlayMode] = useState<'solo' | 'twoPlayer'>(room ? 'twoPlayer' : 'solo');
  const [isBotSowing, setIsBotSowing] = useState(false);
  const [wins, setWins] = useState<{ you: number; partner: number }>({ you: 0, partner: 0 });

  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onGameOverRef.current = onGameOver;
  });

  useEffect(() => {
    if (restartTrigger > 0) {
      setState(createInitialMancalaState());
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
        onGameOverRef.current('Mancala Master! You Win!', `You amassed ${state.pits[P0_STORE]} gemstones!`);
      } else if (state.winner === 1) {
        setWins((w) => ({ ...w, partner: w.partner + 1 }));
        onGameOverRef.current('Nkanyezi Collected Most Gems!', `She claimed ${state.pits[P1_STORE]} gemstones!`);
      } else {
        onGameOverRef.current('Peaceful Standoff!', 'Both Kalah stores hold an equal 24 gemstones!');
      }
    }
  }, [state.winner]);

  // Bot Turn in Solo Mode
  useEffect(() => {
    if (playMode === 'solo' && state.turnSeat === 1 && state.winner === null && !isBotSowing) {
      setIsBotSowing(true);
      const timer = setTimeout(() => {
        const botPit = getSmartMancalaBotMove(state, 1);
        handlePickPit(botPit, true);
        setIsBotSowing(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [state.turnSeat, state.winner, playMode, isBotSowing]);

  const handlePickPit = (pitIndex: number, isBot = false) => {
    if (state.winner !== null) return;
    if (!isBot && playMode === 'solo' && state.turnSeat === 1) return;
    if (!isPitPlayable(state, pitIndex)) return;

    gameAudio.playStep();
    const next = playMancalaMove(state, pitIndex);
    if (next.capturedStones > 0) {
      gameAudio.playCapture();
    } else if (next.freeTurnGranted) {
      gameAudio.playLadderClimb();
    }
    setState(next);
  };

  const renderGemPebbles = (count: number) => {
    const visibleGems = Math.min(count, 12);
    return (
      <div className="flex flex-wrap items-center justify-center gap-1 max-w-[50px]">
        {Array.from({ length: visibleGems }).map((_, i) => (
          <span
            key={`gem-${i}`}
            className="w-2.5 h-2.5 rounded-full shadow-sm"
            style={{
              backgroundColor: GEM_COLORS[i % GEM_COLORS.length],
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-start gap-5 py-2 px-3 text-[#FFF7FA]">
      {/* Mode Selector & Action Status */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#261710] border border-[#442618] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlayMode('solo');
              setState(createInitialMancalaState());
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              playMode === 'solo'
                ? 'bg-[#D97706] text-white shadow-md'
                : 'bg-[#180E09] text-[#CBB3A5] hover:text-white'
            }`}
          >
            Solo vs. Nkanyezi
          </button>
          <button
            type="button"
            onClick={() => {
              setPlayMode('twoPlayer');
              setState(createInitialMancalaState());
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              playMode === 'twoPlayer'
                ? 'bg-[#D97706] text-white shadow-md'
                : 'bg-[#180E09] text-[#CBB3A5] hover:text-white'
            }`}
          >
            Two Players (Pass & Play)
          </button>
        </div>

        {/* Turn Status */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-[#BA9B8B]">Turn:</span>
          {state.turnSeat === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[#FDE68A] font-bold">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-sm animate-pulse" />
              You (Bottom Row)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[#FDA4AF] font-bold">
              <span className="w-3 h-3 rounded-full bg-[#E11D48] shadow-sm animate-pulse" />
              {playMode === 'solo' ? (isBotSowing ? 'Nkanyezi sowing…' : 'Nkanyezi (Top Row)') : 'Nkanyezi (Top Row)'}
            </span>
          )}
        </div>
      </div>

      {/* Action Event Notice */}
      <div className="w-full bg-[#1F120B] border border-[#3A2216] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-serif text-[#FDE68A]">
        <span>{state.lastAction}</span>
        {state.freeTurnGranted && (
          <span className="bg-[#D97706] text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
            BONUS TURN!
          </span>
        )}
      </div>

      {/* Carved Acacia Wood Board */}
      <div className="w-full relative rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-[#422216] via-[#2F180E] to-[#1E0F08] border-[8px] sm:border-[12px] border-[#532E1E] shadow-2xl">
        {/* Brass corner inlay */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#FBBF24]/50" />
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#FBBF24]/50" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#FBBF24]/50" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#FBBF24]/50" />

        <div className="grid grid-cols-8 gap-2 sm:gap-3 items-center">
          {/* LEFT KALAH (Nkanyezi's Store: Pit 13) */}
          <div className="col-span-1 h-44 sm:h-56 rounded-3xl bg-[#170B06] border-2 border-[#381D11] shadow-inner flex flex-col items-center justify-between p-2">
            <span className="text-[10px] font-mono text-[#FDA4AF] font-bold text-center">
              Nkanyezi
            </span>
            {renderGemPebbles(state.pits[P1_STORE])}
            <span className="text-sm sm:text-base font-black font-mono text-[#FDE68A]">
              {state.pits[P1_STORE]}
            </span>
          </div>

          {/* 6 PITS CENTER SECTION (Top: Nkanyezi 12..7, Bottom: You 0..5) */}
          <div className="col-span-6 flex flex-col gap-3 sm:gap-4">
            {/* Top Row: Nkanyezi's pits (12 down to 7 from left to right) */}
            <div className="grid grid-cols-6 gap-2">
              {[12, 11, 10, 9, 8, 7].map((pit) => {
                const isPlayable = isPitPlayable(state, pit);
                return (
                  <button
                    key={`pit-${pit}`}
                    type="button"
                    disabled={!isPlayable || (playMode === 'solo' && state.turnSeat === 1)}
                    onClick={() => handlePickPit(pit)}
                    className={`aspect-square rounded-full flex flex-col items-center justify-between p-1.5 bg-[#170B06] border-2 transition-all shadow-inner relative ${
                      isPlayable
                        ? 'border-[#FDA4AF] hover:scale-105 cursor-pointer ring-2 ring-[#FDA4AF]/40'
                        : 'border-[#381D11] opacity-90'
                    }`}
                  >
                    <span className="text-[9px] font-mono text-[#A38676]">P{pit - 6}</span>
                    {renderGemPebbles(state.pits[pit])}
                    <span className="text-xs font-bold font-mono text-[#FFF7FA]">
                      {state.pits[pit]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Row: Your pits (0 to 5 from left to right) */}
            <div className="grid grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 5].map((pit) => {
                const isPlayable = isPitPlayable(state, pit);
                return (
                  <button
                    key={`pit-${pit}`}
                    type="button"
                    disabled={!isPlayable || (playMode === 'solo' && state.turnSeat === 1)}
                    onClick={() => handlePickPit(pit)}
                    className={`aspect-square rounded-full flex flex-col items-center justify-between p-1.5 bg-[#170B06] border-2 transition-all shadow-inner relative ${
                      isPlayable
                        ? 'border-[#FDE68A] hover:scale-105 cursor-pointer ring-2 ring-[#FDE68A]/40'
                        : 'border-[#381D11] opacity-90'
                    }`}
                  >
                    <span className="text-[9px] font-mono text-[#A38676]">P{pit + 1}</span>
                    {renderGemPebbles(state.pits[pit])}
                    <span className="text-xs font-bold font-mono text-[#FFF7FA]">
                      {state.pits[pit]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT KALAH (Your Store: Pit 6) */}
          <div className="col-span-1 h-44 sm:h-56 rounded-3xl bg-[#170B06] border-2 border-[#381D11] shadow-inner flex flex-col items-center justify-between p-2">
            <span className="text-[10px] font-mono text-[#FDE68A] font-bold text-center">
              You
            </span>
            {renderGemPebbles(state.pits[P0_STORE])}
            <span className="text-sm sm:text-base font-black font-mono text-[#FDE68A]">
              {state.pits[P0_STORE]}
            </span>
          </div>
        </div>

        {/* Board Direction Indicator */}
        <div className="w-full flex justify-between items-center mt-4 pt-2 border-t border-[#532E1E]/60 text-[10px] text-[#A68875] font-mono">
          <span>← SOW COUNTER-CLOCKWISE</span>
          <span>KALAH TROUGH · 48 GEMSTONES</span>
        </div>
      </div>

      {/* Restart Button */}
      <button
        type="button"
        onClick={() => setState(createInitialMancalaState())}
        className="min-h-[42px] px-5 py-2 rounded-xl bg-[#2D1B13] hover:bg-[#3F251A] border border-[#533022] text-xs font-bold text-[#F3E5DC] transition-colors"
      >
        Reset Gemstones
      </button>
    </div>
  );
}
