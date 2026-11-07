import { useState, useEffect, useRef } from 'react';
import { GameRoomDoc } from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import {
  createInitialDotsAndBoxesState,
  DEFAULT_BOX_SIZE,
  DotsAndBoxesState,
  EdgeId,
  getSmartDotsAndBoxesBotMove,
  isEdgeDrawn,
  playDotsAndBoxesMove,
} from '../../games/dotsAndBoxesLogic';

interface DotsAndBoxesArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  restartTrigger?: number;
  onScoreUpdate: (scores: { you: number; partner: number }) => void;
  onGameOver: (headline: string, subline: string) => void;
}

export function DotsAndBoxesArena({
  room,
  restartTrigger = 0,
  onScoreUpdate,
  onGameOver,
}: DotsAndBoxesArenaProps) {
  const [state, setState] = useState<DotsAndBoxesState>(() => createInitialDotsAndBoxesState(DEFAULT_BOX_SIZE));
  const [playMode, setPlayMode] = useState<'solo' | 'twoPlayer'>(room ? 'twoPlayer' : 'solo');
  const [isBotDrawing, setIsBotDrawing] = useState(false);
  const [wins, setWins] = useState<{ you: number; partner: number }>({ you: 0, partner: 0 });

  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onGameOverRef.current = onGameOver;
  });

  useEffect(() => {
    if (restartTrigger > 0) {
      setState(createInitialDotsAndBoxesState(DEFAULT_BOX_SIZE));
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
        onGameOverRef.current('Box Territory Claimed! You Win!', `You conquered ${state.scores[0]} boxes!`);
      } else if (state.winner === 1) {
        setWins((w) => ({ ...w, partner: w.partner + 1 }));
        onGameOverRef.current('Nkanyezi Stamped the Grid!', `She claimed ${state.scores[1]} boxes!`);
      } else {
        onGameOverRef.current('Grid Tie!', `Both claimed an even ${state.scores[0]} boxes!`);
      }
    }
  }, [state.winner]);

  // Bot Turn in Solo Mode
  useEffect(() => {
    if (playMode === 'solo' && state.turnSeat === 1 && state.winner === null && !isBotDrawing) {
      setIsBotDrawing(true);
      const timer = setTimeout(() => {
        const botEdge = getSmartDotsAndBoxesBotMove(state);
        handleDrawLine(botEdge, true);
        setIsBotDrawing(false);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [state.turnSeat, state.winner, playMode, isBotDrawing]);

  const handleDrawLine = (edge: EdgeId, isBot = false) => {
    if (state.winner !== null) return;
    if (!isBot && playMode === 'solo' && state.turnSeat === 1) return;
    if (isEdgeDrawn(state, edge.type, edge.r, edge.c)) return;

    gameAudio.playTilePlace(state.turnSeat === 0);
    const next = playDotsAndBoxesMove(state, edge);
    if (next.chainTurn) {
      gameAudio.playCapture();
    }
    setState(next);
  };

  const dotCount = state.size + 1; // 5 dots for 4 boxes

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-start gap-5 py-2 px-3 text-[#FFF7FA]">
      {/* Mode Selector & Score Counters */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#24171E] border border-[#3E2533] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlayMode('solo');
              setState(createInitialDotsAndBoxesState(DEFAULT_BOX_SIZE));
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
              setState(createInitialDotsAndBoxesState(DEFAULT_BOX_SIZE));
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

        {/* Turn & Score Pill */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
            <span>You: <strong className="text-white font-mono">{state.scores[0]}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
            <span>Nkanyezi: <strong className="text-white font-mono">{state.scores[1]}</strong></span>
          </div>
        </div>
      </div>

      {/* Action Notice */}
      <div className="w-full bg-[#1C1117] border border-[#3A202E] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-serif text-[#FDE68A]">
        <span>{state.lastAction}</span>
        {state.chainTurn && (
          <span className="bg-[#E11D48] text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
            CHAIN TURN!
          </span>
        )}
      </div>

      {/* Parchment Drafting Grid */}
      <div className="w-full max-w-[480px] aspect-square rounded-3xl p-5 sm:p-7 bg-[#FAF6EE] text-[#1E293B] border-[8px] sm:border-[12px] border-[#3E2319] shadow-2xl relative select-none">
        {/* Brass corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#B45309]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#B45309]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#B45309]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#B45309]" />

        {/* 4x4 Boxes Grid with connecting edges */}
        <div className="w-full h-full relative">
          {/* Claimed Boxes */}
          {state.boxes.map((row, r) =>
            row.map((boxOwner, c) => {
              const topPct = (r / state.size) * 100;
              const leftPct = (c / state.size) * 100;
              const sizePct = (1 / state.size) * 100;

              return (
                <div
                  key={`box-${r}-${c}`}
                  style={{
                    top: `${topPct}%`,
                    left: `${leftPct}%`,
                    width: `${sizePct}%`,
                    height: `${sizePct}%`,
                  }}
                  className="absolute flex items-center justify-center p-1 pointer-events-none"
                >
                  {boxOwner !== null && (
                    <div
                      className={`w-full h-full rounded-2xl flex items-center justify-center shadow-md animate-scale-in ${
                        boxOwner === 0
                          ? 'bg-[#1E3A8A]/15 border-2 border-[#1E3A8A] text-[#1E3A8A]'
                          : 'bg-[#BE123C]/15 border-2 border-[#BE123C] text-[#BE123C]'
                      }`}
                    >
                      <span className="font-serif font-black text-xl sm:text-2xl drop-shadow-sm">
                        {boxOwner === 0 ? 'Y' : 'N'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Horizontal Edges */}
          {state.hEdges.map((row, r) =>
            row.map((drawn, c) => {
              const topPct = (r / state.size) * 100;
              const leftPct = (c / state.size) * 100;
              const widthPct = (1 / state.size) * 100;

              return (
                <button
                  key={`h-edge-${r}-${c}`}
                  type="button"
                  disabled={drawn || state.winner !== null || (playMode === 'solo' && state.turnSeat === 1)}
                  onClick={() => handleDrawLine({ type: 'h', r, c })}
                  aria-label={`Draw horizontal line row ${r} col ${c}`}
                  style={{
                    top: `calc(${topPct}% - 7px)`,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    height: '14px',
                  }}
                  className={`absolute z-10 flex items-center justify-center transition-all cursor-pointer group ${
                    drawn ? 'pointer-events-none' : ''
                  }`}
                >
                  <div
                    className={`w-full h-[5px] rounded-full transition-all ${
                      drawn
                        ? 'bg-[#0F172A]'
                        : 'bg-transparent group-hover:bg-[#CBD5E1] group-hover:h-[6px]'
                    }`}
                  />
                </button>
              );
            })
          )}

          {/* Vertical Edges */}
          {state.vEdges.map((row, r) =>
            row.map((drawn, c) => {
              const topPct = (r / state.size) * 100;
              const leftPct = (c / state.size) * 100;
              const heightPct = (1 / state.size) * 100;

              return (
                <button
                  key={`v-edge-${r}-${c}`}
                  type="button"
                  disabled={drawn || state.winner !== null || (playMode === 'solo' && state.turnSeat === 1)}
                  onClick={() => handleDrawLine({ type: 'v', r, c })}
                  aria-label={`Draw vertical line row ${r} col ${c}`}
                  style={{
                    top: `${topPct}%`,
                    left: `calc(${leftPct}% - 7px)`,
                    width: '14px',
                    height: `${heightPct}%`,
                  }}
                  className={`absolute z-10 flex items-center justify-center transition-all cursor-pointer group ${
                    drawn ? 'pointer-events-none' : ''
                  }`}
                >
                  <div
                    className={`w-[5px] h-full rounded-full transition-all ${
                      drawn
                        ? 'bg-[#0F172A]'
                        : 'bg-transparent group-hover:bg-[#CBD5E1] group-hover:w-[6px]'
                    }`}
                  />
                </button>
              );
            })
          )}

          {/* Dot Pegs (Grid Intersection Pins) */}
          {Array.from({ length: dotCount }).map((_, r) =>
            Array.from({ length: dotCount }).map((_, c) => {
              const topPct = (r / state.size) * 100;
              const leftPct = (c / state.size) * 100;

              return (
                <div
                  key={`dot-${r}-${c}`}
                  style={{
                    top: `calc(${topPct}% - 6px)`,
                    left: `calc(${leftPct}% - 6px)`,
                  }}
                  className="absolute z-20 w-3 h-3 rounded-full bg-[#381E15] border-2 border-[#D97706] shadow-sm pointer-events-none"
                />
              );
            })
          )}
        </div>
      </div>

      {/* Restart Button */}
      <button
        type="button"
        onClick={() => setState(createInitialDotsAndBoxesState(DEFAULT_BOX_SIZE))}
        className="min-h-[42px] px-5 py-2 rounded-xl bg-[#2C1924] hover:bg-[#3D2332] border border-[#522F43] text-xs font-bold text-[#F3DCE4] transition-colors"
      >
        Clear Drafting Grid
      </button>
    </div>
  );
}
