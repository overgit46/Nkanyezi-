import { useState, useEffect, useRef } from 'react';
import { GameRoomDoc } from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import {
  CHECKERS_SIZE,
  CheckersMove,
  CheckersState,
  createInitialCheckersState,
  getAllLegalMoves,
  getSmartCheckersBotMove,
  isDarkSquare,
  playCheckersMove,
} from '../../games/checkersLogic';

interface CheckersArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  restartTrigger?: number;
  onScoreUpdate: (scores: { you: number; partner: number }) => void;
  onGameOver: (headline: string, subline: string) => void;
}

export function CheckersArena({
  room,
  restartTrigger = 0,
  onScoreUpdate,
  onGameOver,
}: CheckersArenaProps) {
  const [state, setState] = useState<CheckersState>(() => createInitialCheckersState());
  const [playMode, setPlayMode] = useState<'solo' | 'twoPlayer'>(room ? 'twoPlayer' : 'solo');
  const [selectedCoord, setSelectedCoord] = useState<{ r: number; c: number } | null>(null);
  const [isBotMoving, setIsBotMoving] = useState(false);
  const [wins, setWins] = useState<{ you: number; partner: number }>({ you: 0, partner: 0 });

  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onGameOverRef.current = onGameOver;
  });

  useEffect(() => {
    if (restartTrigger > 0) {
      setState(createInitialCheckersState());
      setSelectedCoord(null);
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
        onGameOverRef.current('Checkers Triumph! You Win!', 'You cleared all opposing pieces from the board!');
      } else {
        setWins((w) => ({ ...w, partner: w.partner + 1 }));
        onGameOverRef.current('Nkanyezi Crowned Champion!', 'Her tactical captures outmaneuvered the board!');
      }
    }
  }, [state.winner]);

  // Keep selectedCoord in sync with multi-jump locking
  useEffect(() => {
    if (state.multiJumpPiece) {
      setSelectedCoord(state.multiJumpPiece);
    }
  }, [state.multiJumpPiece]);

  // Bot Turn in Solo Mode
  useEffect(() => {
    if (playMode === 'solo' && state.turnSeat === 1 && state.winner === null && !isBotMoving) {
      setIsBotMoving(true);
      const timer = setTimeout(() => {
        const botMove = getSmartCheckersBotMove(state);
        if (botMove) {
          executeMove(botMove);
        }
        setIsBotMoving(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.turnSeat, state.winner, playMode, isBotMoving, state.board]);

  const legalMoves = getAllLegalMoves(state);

  const availableMovesFromSelected = selectedCoord
    ? legalMoves.filter((m) => m.fromR === selectedCoord.r && m.fromC === selectedCoord.c)
    : [];

  const handleCellClick = (r: number, c: number) => {
    if (state.winner !== null) return;
    if (playMode === 'solo' && state.turnSeat === 1) return;

    // If locked in multi-jump, can only move the locked piece
    if (state.multiJumpPiece && (state.multiJumpPiece.r !== r || state.multiJumpPiece.c !== c)) {
      // Check if clicking a valid destination for the locked piece
      const jumpDest = availableMovesFromSelected.find((m) => m.toR === r && m.toC === c);
      if (jumpDest) {
        executeMove(jumpDest);
      }
      return;
    }

    const piece = state.board[r][c];

    // Clicking own piece to select
    if (piece && piece.player === state.turnSeat) {
      // Check if this piece has legal moves
      const pieceHasMoves = legalMoves.some((m) => m.fromR === r && m.fromC === c);
      if (pieceHasMoves) {
        setSelectedCoord({ r, c });
      }
      return;
    }

    // Clicking destination square
    if (selectedCoord) {
      const matchMove = availableMovesFromSelected.find((m) => m.toR === r && m.toC === c);
      if (matchMove) {
        executeMove(matchMove);
        return;
      }
    }

    setSelectedCoord(null);
  };

  const executeMove = (move: CheckersMove) => {
    gameAudio.playStep();
    if (move.isJump) {
      gameAudio.playCapture();
    }
    const next = playCheckersMove(state, move);
    setState(next);
    if (!next.multiJumpPiece) {
      setSelectedCoord(null);
    }
  };

  const p0PieceCount = state.board.flat().filter((p) => p?.player === 0).length;
  const p1PieceCount = state.board.flat().filter((p) => p?.player === 1).length;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-start gap-5 py-2 px-3 text-[#FFF7FA]">
      {/* Mode Selector & Piece Counts */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#24171E] border border-[#3E2533] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlayMode('solo');
              setState(createInitialCheckersState());
              setSelectedCoord(null);
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
              setState(createInitialCheckersState());
              setSelectedCoord(null);
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

        {/* Piece Counts */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#1E3A8A]" />
            <span>You: <strong className="text-white font-mono">{p0PieceCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#E11D48]" />
            <span>Nkanyezi: <strong className="text-white font-mono">{p1PieceCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Action Notice */}
      <div className="w-full bg-[#1C1117] border border-[#3A202E] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-serif text-[#FDE68A]">
        <span>{state.lastAction}</span>
        {state.multiJumpPiece && (
          <span className="bg-[#E11D48] text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            MULTI-JUMP!
          </span>
        )}
      </div>

      {/* Walnut & Maple 8x8 Board */}
      <div className="w-full max-w-[480px] aspect-square rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-[#381E15] via-[#2A160F] to-[#1E100A] border-[8px] sm:border-[12px] border-[#4A281C] shadow-2xl relative select-none">
        {/* Brass corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#EAB308]/60" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#EAB308]/60" />

        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-2xl overflow-hidden border-2 border-[#33180D] shadow-inner">
          {state.board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = isDarkSquare(r, c);
              const isSelected = selectedCoord?.r === r && selectedCoord?.c === c;
              const isDestination = availableMovesFromSelected.some(
                (m) => m.toR === r && m.toC === c
              );

              return (
                <div
                  key={`cell-${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex items-center justify-center cursor-pointer transition-all ${
                    isDark ? 'bg-[#3A1F13]' : 'bg-[#E5D0B5]'
                  } ${isSelected ? 'ring-4 ring-[#FDE68A] z-10' : ''}`}
                >
                  {/* Valid Move Target Highlight Dot */}
                  {isDestination && (
                    <div className="absolute w-4 h-4 rounded-full bg-[#10B981] shadow-lg animate-ping z-20" />
                  )}
                  {isDestination && (
                    <div className="absolute w-3.5 h-3.5 rounded-full bg-[#10B981] border border-white z-20" />
                  )}

                  {/* Piece */}
                  {cell !== null && (
                    <div
                      className={`w-[82%] h-[82%] rounded-full flex items-center justify-center shadow-lg transition-transform ${
                        cell.player === 0
                          ? 'bg-gradient-to-br from-[#2563EB] via-[#1E3A8A] to-[#172554] border-2 border-[#60A5FA]'
                          : 'bg-gradient-to-br from-[#FB7185] via-[#E11D48] to-[#881337] border-2 border-[#FDA4AF]'
                      } ${isSelected ? 'scale-110 shadow-xl' : 'hover:scale-105'}`}
                    >
                      {cell.isKing && (
                        <span className="text-sm sm:text-base font-black text-[#FDE68A] drop-shadow-md">
                          👑
                        </span>
                      )}
                      {!cell.isKing && (
                        <div className="w-3 h-3 rounded-full border border-white/30" />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Restart Button */}
      <button
        type="button"
        onClick={() => {
          setState(createInitialCheckersState());
          setSelectedCoord(null);
        }}
        className="min-h-[42px] px-5 py-2 rounded-xl bg-[#2C1924] hover:bg-[#3D2332] border border-[#522F43] text-xs font-bold text-[#F3DCE4] transition-colors"
      >
        Reset Checkers Board
      </button>
    </div>
  );
}
