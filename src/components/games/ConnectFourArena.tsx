import { useState, useEffect, useRef } from 'react';
import { GameRoomDoc } from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import {
  C4_COLS,
  C4_ROWS,
  ConnectFourState,
  createInitialConnectFourState,
  getLowestEmptyRow,
  getSmartConnectFourBotMove,
  isColumnFull,
  playConnectFourMove,
} from '../../games/connectFourLogic';

interface ConnectFourArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  restartTrigger?: number;
  onScoreUpdate: (scores: { you: number; partner: number }) => void;
  onGameOver: (headline: string, subline: string) => void;
}

export function ConnectFourArena({
  room,
  restartTrigger = 0,
  onScoreUpdate,
  onGameOver,
}: ConnectFourArenaProps) {
  const [state, setState] = useState<ConnectFourState>(() => createInitialConnectFourState());
  const [playMode, setPlayMode] = useState<'solo' | 'twoPlayer'>(room ? 'twoPlayer' : 'solo');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [wins, setWins] = useState<{ you: number; partner: number }>({ you: 0, partner: 0 });

  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onGameOverRef.current = onGameOver;
  });

  // Handle external restart trigger
  useEffect(() => {
    if (restartTrigger > 0) {
      setState(createInitialConnectFourState());
    }
  }, [restartTrigger]);

  // Sync score changes to parent
  useEffect(() => {
    onScoreUpdateRef.current(wins);
  }, [wins]);

  // Handle Win / Draw
  useEffect(() => {
    if (state.winner !== null) {
      gameAudio.playWinFanfare();
      if (state.winner === 0) {
        setWins((w) => ({ ...w, you: w.you + 1 }));
        onGameOverRef.current('Four-in-a-Row! You Win!', 'A brilliant diagonal connection across the board!');
      } else if (state.winner === 1) {
        setWins((w) => ({ ...w, partner: w.partner + 1 }));
        onGameOverRef.current('Nkanyezi Connected Four!', 'Her winning streak shines bright!');
      } else {
        onGameOverRef.current('Board Standoff!', 'A full rack with zero four-in-a-rows!');
      }
    }
  }, [state.winner]);

  // Bot Turn in Solo Mode
  useEffect(() => {
    if (playMode === 'solo' && state.turnSeat === 1 && state.winner === null && !isBotThinking) {
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        const botCol = getSmartConnectFourBotMove(state, 1);
        handleDrop(botCol, true);
        setIsBotThinking(false);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [state.turnSeat, state.winner, playMode, isBotThinking]);

  const handleDrop = (col: number, isBot = false) => {
    if (state.winner !== null) return;
    if (!isBot && playMode === 'solo' && state.turnSeat === 1) return;
    if (isColumnFull(state.board, col)) return;

    gameAudio.playTilePlace(state.turnSeat === 0);
    setState((prev) => playConnectFourMove(prev, col));
  };

  const isWinningCell = (r: number, c: number): boolean => {
    if (!state.winningCoords) return false;
    return state.winningCoords.some(([wr, wc]) => wr === r && wc === c);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-start gap-5 py-2 px-3 text-[#FFF7FA]">
      {/* Game Mode Selector & Turn HUD */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#24171E] border border-[#3E2533] p-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlayMode('solo');
              setState(createInitialConnectFourState());
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
              setState(createInitialConnectFourState());
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

        {/* Turn Status */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-[#CBA5B5]">Turn:</span>
          {state.turnSeat === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[#FB7185] font-bold">
              <span className="w-3 h-3 rounded-full bg-[#E11D48] shadow-sm animate-pulse" />
              You (Ruby)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[#FDE68A] font-bold">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-sm animate-pulse" />
              {playMode === 'solo' ? (isBotThinking ? 'Nkanyezi thinking…' : 'Nkanyezi (Gold)') : 'Nkanyezi (Gold)'}
            </span>
          )}
        </div>
      </div>

      {/* Column Drop Arrow Indicators */}
      <div className="w-full max-w-[560px] grid grid-cols-7 gap-1.5 sm:gap-2 px-3">
        {Array.from({ length: C4_COLS }).map((_, c) => {
          const isFull = isColumnFull(state.board, c);
          const isHovered = hoveredCol === c;
          const isMyTurn = playMode === 'twoPlayer' || state.turnSeat === 0;

          return (
            <button
              key={`col-drop-${c}`}
              type="button"
              disabled={isFull || state.winner !== null || (playMode === 'solo' && state.turnSeat === 1)}
              onClick={() => handleDrop(c)}
              onMouseEnter={() => setHoveredCol(c)}
              onMouseLeave={() => setHoveredCol(null)}
              aria-label={`Drop disc in column ${c + 1}`}
              className={`h-9 rounded-t-lg flex items-center justify-center transition-all ${
                isFull || state.winner !== null
                  ? 'opacity-20 cursor-not-allowed'
                  : isHovered && isMyTurn
                  ? 'bg-[#E11D48]/30 scale-105'
                  : 'bg-[#2E1823] hover:bg-[#3D202F]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`w-5 h-5 transition-transform ${
                  isHovered && isMyTurn ? 'translate-y-1 text-[#FB7185]' : 'text-[#8C6B7B]'
                }`}
                aria-hidden="true"
              >
                <path
                  d="M12 4v12m0 0l-4-4m4 4l4-4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Upright Mahogany Vertical Board Rack */}
      <div className="w-full max-w-[560px] relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[#381E15] via-[#2A160F] to-[#1F100A] border-[6px] sm:border-[8px] border-[#4A281C] shadow-2xl">
        {/* Brass corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#EAB308]/60" />

        {/* 6x7 Circular Cutout Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 bg-[#120B0F] p-2 sm:p-3 rounded-2xl shadow-inner border border-[#3E2319]">
          {state.board.map((row, r) =>
            row.map((cell, c) => {
              const isWin = isWinningCell(r, c);
              const isHoverPreview =
                hoveredCol === c &&
                cell === null &&
                r === getLowestEmptyRow(state.board, c) &&
                state.winner === null &&
                (playMode === 'twoPlayer' || state.turnSeat === 0);

              return (
                <div
                  key={`cell-${r}-${c}`}
                  onClick={() => handleDrop(c)}
                  className={`aspect-square rounded-full flex items-center justify-center relative cursor-pointer overflow-hidden transition-all shadow-inner ${
                    cell === null ? 'bg-[#1C1217]' : ''
                  }`}
                >
                  {/* Empty cell bevel ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-black/50 pointer-events-none" />

                  {/* Placed Token */}
                  {cell !== null && (
                    <div
                      className={`w-[90%] h-[90%] rounded-full flex items-center justify-center transition-all transform shadow-md ${
                        cell === 0
                          ? 'bg-gradient-to-br from-[#FB7185] via-[#E11D48] to-[#9F1239] border-2 border-[#FDA4AF]'
                          : 'bg-gradient-to-br from-[#FDE68A] via-[#F59E0B] to-[#B45309] border-2 border-[#FEF3C7]'
                      } ${isWin ? 'ring-4 ring-[#FDE68A] scale-105 animate-pulse' : ''}`}
                    >
                      {/* Token Inner Crest */}
                      <span className="text-[10px] sm:text-xs font-black select-none opacity-80">
                        {cell === 0 ? '♥' : '★'}
                      </span>
                    </div>
                  )}

                  {/* Hover Ghost Token Preview */}
                  {isHoverPreview && (
                    <div
                      className={`w-[85%] h-[85%] rounded-full opacity-40 border-2 border-dashed ${
                        state.turnSeat === 0
                          ? 'bg-[#E11D48] border-[#FDA4AF]'
                          : 'bg-[#F59E0B] border-[#FEF3C7]'
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Board Base Feet */}
        <div className="w-full flex justify-between items-center mt-3 pt-2 border-t border-[#4A281C]/60 text-[10px] text-[#A68895] px-2 font-mono">
          <span>RACK · 7×6 VERTICAL</span>
          <span>FOUR-IN-A-ROW</span>
        </div>
      </div>

      {/* Restart Button */}
      <button
        type="button"
        onClick={() => setState(createInitialConnectFourState())}
        className="min-h-[42px] px-5 py-2 rounded-xl bg-[#2C1924] hover:bg-[#3D2332] border border-[#522F43] text-xs font-bold text-[#F3DCE4] transition-colors shadow-sm"
      >
        Reset Connect Four Rack
      </button>
    </div>
  );
}
