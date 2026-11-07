/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import {
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  createInitialLudoState,
  executeLudoTokenMove,
  getLegalTokenIndices,
  handleLudoDiceRoll,
  isTokenInGoal,
  LudoState,
  SAFE_SQUARES,
} from '../../games/ludoLogic';
import { gameAudio } from '../../games/soundFx';
import { GameRoomDoc, updateRoomGameplay } from '../../firebase/roomService';
import { ludoStateFromMap, ludoStateToMap } from '../../games/roomStateCodec';

interface LudoArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  player1Name?: string;
  player2Name?: string;
  onScoreUpdate?: (scores: { you: number; partner: number }) => void;
  onGameOver?: (winnerName: string, subline: string) => void;
  restartTrigger?: number;
}

// 52-tile track coordinates mapped to 15x15 Ludo grid (row: 0..14, col: 0..14)
const TRACK_COORDINATES: readonly { r: number; c: number }[] = [
  // North Arm left (P0 Entry at 0)
  { r: 1, c: 6 }, // 0 (P0 Entry, Safe Star)
  { r: 2, c: 6 }, // 1
  { r: 3, c: 6 }, // 2
  { r: 4, c: 6 }, // 3
  { r: 5, c: 6 }, // 4
  // West Arm top
  { r: 6, c: 5 }, // 5
  { r: 6, c: 4 }, // 6
  { r: 6, c: 3 }, // 7
  { r: 6, c: 2 }, // 8 (Safe Star)
  { r: 6, c: 1 }, // 9
  { r: 6, c: 0 }, // 10
  // West Arm tip
  { r: 7, c: 0 }, // 11
  // West Arm bottom
  { r: 8, c: 0 }, // 12
  { r: 8, c: 1 }, // 13 (Safe Star)
  { r: 8, c: 2 }, // 14
  { r: 8, c: 3 }, // 15
  { r: 8, c: 4 }, // 16
  { r: 8, c: 5 }, // 17
  // South Arm left
  { r: 9, c: 6 }, // 18
  { r: 10, c: 6 }, // 19
  { r: 11, c: 6 }, // 20
  { r: 12, c: 6 }, // 21 (Safe Star)
  { r: 13, c: 6 }, // 22
  { r: 14, c: 6 }, // 23
  // South Arm tip
  { r: 14, c: 7 }, // 24
  { r: 14, c: 8 }, // 25 (P1 Gate)
  // South Arm right (P1 Entry at 26)
  { r: 13, c: 8 }, // 26 (P1 Entry, Safe Star)
  { r: 12, c: 8 }, // 27
  { r: 11, c: 8 }, // 28
  { r: 10, c: 8 }, // 29
  { r: 9, c: 8 }, // 30
  // East Arm bottom
  { r: 8, c: 9 }, // 31
  { r: 8, c: 10 }, // 32
  { r: 8, c: 11 }, // 33
  { r: 8, c: 12 }, // 34 (Safe Star)
  { r: 8, c: 13 }, // 35
  { r: 8, c: 14 }, // 36
  // East Arm tip
  { r: 7, c: 14 }, // 37
  // East Arm top
  { r: 6, c: 14 }, // 38
  { r: 6, c: 13 }, // 39 (Safe Star)
  { r: 6, c: 12 }, // 40
  { r: 6, c: 11 }, // 41
  { r: 6, c: 10 }, // 42
  { r: 6, c: 9 }, // 43
  // North Arm right
  { r: 5, c: 8 }, // 44
  { r: 4, c: 8 }, // 45
  { r: 3, c: 8 }, // 46
  { r: 2, c: 8 }, // 47 (Safe Star)
  { r: 1, c: 8 }, // 48
  { r: 0, c: 8 }, // 49
  // North Arm tip
  { r: 0, c: 7 }, // 50
  { r: 0, c: 6 }, // 51 (P0 Gate)
];

// Home runway paths:
// P0 (Navy): rows 1..5 in col 7, Goal at center
const P0_HOME_COORDS: Record<number, { r: number; c: number }> = {
  100: { r: 1, c: 7 },
  101: { r: 2, c: 7 },
  102: { r: 3, c: 7 },
  103: { r: 4, c: 7 },
  104: { r: 5, c: 7 },
};

// P1 (Rose Pink): rows 13..9 in col 7, Goal at center
const P1_HOME_COORDS: Record<number, { r: number; c: number }> = {
  200: { r: 13, c: 7 },
  201: { r: 12, c: 7 },
  202: { r: 11, c: 7 },
  203: { r: 10, c: 7 },
  204: { r: 9, c: 7 },
};

export function LudoArena({
  room,
  userUid,
  player1Name = 'You',
  player2Name = 'Nkanyezi',
  onScoreUpdate,
  onGameOver,
  restartTrigger = 0,
}: LudoArenaProps) {
  const [localState, setLocalState] = useState<LudoState>(createInitialLudoState);
  const [isRolling, setIsRolling] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(1);
  const [botThinking, setBotThinking] = useState(false);
  const [muted, setMuted] = useState(gameAudio.muted);

  const isOnline = Boolean(room);
  const activeState = room ? ludoStateFromMap(room.ludo, room.turnSeat) : localState;
  const isHost = !room || (userUid ? room.hostUid === userUid : true);
  const mySeat = isHost ? 0 : 1;
  const isMyTurn = !isOnline || activeState.turnSeat === mySeat;

  const legalTokens = useMemo(() => {
    return getLegalTokenIndices(activeState, activeState.lastDice, activeState.turnSeat);
  }, [activeState]);

  // Handle Game Over
  useEffect(() => {
    if (activeState.winner !== null) {
      const winnerName = activeState.winner === 0 ? player1Name : player2Name;
      onGameOver?.(
        `${winnerName} Wins Couple’s Ludo!`,
        activeState.winner === mySeat
          ? 'Victory! Both of your tokens raced into the home goal!'
          : `${winnerName} navigated home first!`
      );
    }
  }, [activeState.winner, mySeat, onGameOver, player1Name, player2Name]);

  // Restart trigger from HUD
  useEffect(() => {
    if (restartTrigger > 0) {
      handleReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartTrigger]);

  const handleReset = async () => {
    const fresh = createInitialLudoState();
    if (room) {
      await updateRoomGameplay(room.roomCode, {
        activeGame: 'ludo',
        turnSeat: 0,
        ludo: ludoStateToMap(fresh),
        roomStatus: room.guestUid ? 'playing' : 'waiting',
      });
    } else {
      setLocalState(fresh);
    }
  };

  // Bot response in local single player mode
  useEffect(() => {
    if (isOnline) return;
    if (
      activeState.turnSeat === 1 &&
      activeState.winner === null &&
      !botThinking &&
      !isRolling
    ) {
      setBotThinking(true);
      if (activeState.phase === 'need_roll') {
        const timer = window.setTimeout(() => {
          executeRoll(1);
          setBotThinking(false);
        }, 900);
        return () => window.clearTimeout(timer);
      } else if (activeState.phase === 'need_move') {
        const timer = window.setTimeout(() => {
          const legals = getLegalTokenIndices(activeState, activeState.lastDice, activeState.turnSeat);
          if (legals.length > 0) {
            handleSelectToken(legals[0]);
          }
          setBotThinking(false);
        }, 800);
        return () => window.clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeState.turnSeat, activeState.phase, activeState.winner, isOnline, isRolling]);

  const executeRoll = async (seatToRoll: 0 | 1) => {
    if (isRolling || activeState.phase !== 'need_roll' || activeState.winner !== null) return;

    setIsRolling(true);
    gameAudio.playDiceRoll();

    let ticks = 0;
    const interval = window.setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1);
      ticks++;
      if (ticks > 7) {
        window.clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        const rollResult = handleLudoDiceRoll(activeState, finalRoll, player1Name, player2Name);
        setDiceDisplay(finalRoll);

        if (finalRoll === 6) {
          gameAudio.playWinFanfare();
        } else {
          gameAudio.playStep();
        }

        if (room) {
          updateRoomGameplay(room.roomCode, {
            turnSeat: rollResult.nextState.turnSeat,
            ludo: ludoStateToMap(rollResult.nextState),
          }).catch(() => {});
        } else {
          setLocalState(rollResult.nextState);
        }

        setIsRolling(false);
      }
    }, 55);
  };

  const handleSelectToken = (tokenIdx: number) => {
    if (!legalTokens.includes(tokenIdx) || activeState.phase !== 'need_move') return;

    const moveRes = executeLudoTokenMove(
      activeState,
      tokenIdx,
      player1Name,
      player2Name
    );

    if (moveRes.capturedOpponent) {
      gameAudio.playCapture();
    } else if (moveRes.reachedGoal) {
      gameAudio.playWinFanfare();
    } else {
      gameAudio.playStep();
    }

    if (moveRes.won) {
      onScoreUpdate?.({
        you: moveRes.nextState.winner === 0 ? 1 : 0,
        partner: moveRes.nextState.winner === 1 ? 1 : 0,
      });
    }

    if (room) {
      updateRoomGameplay(room.roomCode, {
        turnSeat: moveRes.nextState.turnSeat,
        ludo: ludoStateToMap(moveRes.nextState),
        roomStatus: moveRes.won ? 'round_over' : 'playing',
      }).catch(() => {});
    } else {
      setLocalState(moveRes.nextState);
    }
  };

  const renderDiceIcon = (num: number) => {
    switch (num) {
      case 1:
        return <Dice1 className="w-10 h-10 text-[#FDE68A]" />;
      case 2:
        return <Dice2 className="w-10 h-10 text-[#FDE68A]" />;
      case 3:
        return <Dice3 className="w-10 h-10 text-[#FDE68A]" />;
      case 4:
        return <Dice4 className="w-10 h-10 text-[#FDE68A]" />;
      case 5:
        return <Dice5 className="w-10 h-10 text-[#FDE68A]" />;
      case 6:
        return <Dice6 className="w-10 h-10 text-[#FDE68A]" />;
      default:
        return <Dice1 className="w-10 h-10 text-[#FDE68A]" />;
    }
  };

  // Build a lookup of which token sits at (row, col)
  const cellTokens = useMemo(() => {
    const map = new Map<string, number[]>();
    activeState.tokens.forEach((pos, idx) => {
      if (pos >= 0 && pos < 52) {
        const coord = TRACK_COORDINATES[pos];
        if (coord) {
          const key = `${coord.r},${coord.c}`;
          const existing = map.get(key) || [];
          existing.push(idx);
          map.set(key, existing);
        }
      } else if (pos >= 100 && pos <= 104) {
        const coord = P0_HOME_COORDS[pos];
        if (coord) {
          const key = `${coord.r},${coord.c}`;
          const existing = map.get(key) || [];
          existing.push(idx);
          map.set(key, existing);
        }
      } else if (pos >= 200 && pos <= 204) {
        const coord = P1_HOME_COORDS[pos];
        if (coord) {
          const key = `${coord.r},${coord.c}`;
          const existing = map.get(key) || [];
          existing.push(idx);
          map.set(key, existing);
        }
      }
    });
    return map;
  }, [activeState.tokens]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 py-2 select-none">
      {/* ================= AUTHENTIC 15x15 CRUCIFORM LUDO BOARD ================= */}
      <div className="relative w-full max-w-[500px] aspect-square rounded-[32px] bg-[#1E110A] p-2.5 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-[8px] sm:border-[12px] border-[#381E15] flex flex-col justify-between overflow-hidden shrink-0">
        {/* Brass Corner Caps */}
        <div className="absolute top-1 left-1 w-6 h-6 border-t-2 border-l-2 border-[#FDE68A]/60 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-1 right-1 w-6 h-6 border-t-2 border-r-2 border-[#FDE68A]/60 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-6 h-6 border-b-2 border-l-2 border-[#FDE68A]/60 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-6 h-6 border-b-2 border-r-2 border-[#FDE68A]/60 rounded-br-lg pointer-events-none" />

        {/* 15x15 Grid Layout Container */}
        <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px] bg-[#2E1810] rounded-2xl overflow-hidden border border-[#522D1E]">
          {/* ================= 4 CORNER QUADRANTS (6x6 each) ================= */}
          {/* 1. Player 0 Yard: Top-Left (Royal Blue) */}
          <div
            className="col-start-1 col-end-7 row-start-1 row-end-7 bg-[#132A54] border-2 border-[#1E4282] p-2 sm:p-3 flex flex-col justify-between rounded-tl-xl shadow-inner z-10"
          >
            <div className="flex items-center justify-between text-[11px] text-[#93C5FD] font-semibold">
              <span className="flex items-center gap-1">
                <span>👑</span>
                <span>{player1Name}’s Yard</span>
              </span>
              <span className="text-[10px] text-[#BFDBFE] font-mono">Roll 6</span>
            </div>

            {/* Token Nests */}
            <div className="grid grid-cols-2 gap-2 my-auto p-1.5 rounded-2xl bg-[#0D1D3A]/80 border border-[#1E3A8A]">
              {[0, 1].map((tIdx) => {
                const inBase = activeState.tokens[tIdx] === -1;
                const isLegal = legalTokens.includes(tIdx);
                const isTurn = activeState.turnSeat === 0;

                return (
                  <button
                    key={tIdx}
                    type="button"
                    disabled={!isLegal || (!isMyTurn && isOnline)}
                    onClick={() => handleSelectToken(tIdx)}
                    className={`aspect-square rounded-full flex items-center justify-center transition-all ${
                      inBase
                        ? 'bg-[#1D4ED8] border-2 border-[#FDE68A] text-white shadow-lg'
                        : 'bg-[#162744] border border-dashed border-[#3B82F6]/30 text-gray-400'
                    } ${
                      isLegal && isTurn
                        ? 'ring-4 ring-[#FDE68A] scale-110 animate-bounce cursor-pointer z-20'
                        : ''
                    }`}
                  >
                    {inBase ? (
                      <div className="flex flex-col items-center">
                        <span className="text-xs">👑</span>
                        <span className="text-[9px] font-bold text-[#FDE68A]">P1</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-[#60A5FA]">out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Top-Right Corner Quadrant (Emerald Vintage Motif) */}
          <div
            className="col-start-10 col-end-16 row-start-1 row-end-7 bg-[#103423] border-2 border-[#185338] p-3 flex flex-col items-center justify-center rounded-tr-xl opacity-90"
          >
            <div className="w-16 h-16 rounded-full border-2 border-[#34D399]/40 flex items-center justify-center bg-[#0B2317]">
              <span className="text-2xl opacity-60">🎲</span>
            </div>
            <p className="font-editorial text-xs text-[#A7F3D0] mt-2 font-semibold">Ludo Lounge</p>
          </div>

          {/* 3. Bottom-Left Corner Quadrant (Amber Vintage Motif) */}
          <div
            className="col-start-1 col-end-7 row-start-10 row-end-16 bg-[#3B250C] border-2 border-[#593913] p-3 flex flex-col items-center justify-center rounded-bl-xl opacity-90"
          >
            <div className="w-16 h-16 rounded-full border-2 border-[#FDE68A]/40 flex items-center justify-center bg-[#291A08]">
              <span className="text-2xl opacity-60">★</span>
            </div>
            <p className="font-editorial text-xs text-[#FDE68A] mt-2 font-semibold">8 Safe Stars</p>
          </div>

          {/* 4. Player 1 Yard: Bottom-Right (Rose Pink for Nkanyezi) */}
          <div
            className="col-start-10 col-end-16 row-start-10 row-end-16 bg-[#4A1226] border-2 border-[#781D3E] p-2 sm:p-3 flex flex-col justify-between rounded-br-xl shadow-inner z-10"
          >
            <div className="flex items-center justify-between text-[11px] text-[#F9A8D4] font-semibold">
              <span className="flex items-center gap-1">
                <span>✨</span>
                <span>{player2Name}’s Yard</span>
              </span>
              <span className="text-[10px] text-[#FBCFE8] font-mono">Roll 6</span>
            </div>

            {/* Token Nests */}
            <div className="grid grid-cols-2 gap-2 my-auto p-1.5 rounded-2xl bg-[#330D1A]/80 border border-[#831843]">
              {[2, 3].map((tIdx) => {
                const inBase = activeState.tokens[tIdx] === -1;
                const isLegal = legalTokens.includes(tIdx);
                const isTurn = activeState.turnSeat === 1;

                return (
                  <button
                    key={tIdx}
                    type="button"
                    disabled={!isLegal || (!isMyTurn && isOnline)}
                    onClick={() => handleSelectToken(tIdx)}
                    className={`aspect-square rounded-full flex items-center justify-center transition-all ${
                      inBase
                        ? 'bg-[#D81B60] border-2 border-white text-white shadow-lg'
                        : 'bg-[#290B16] border border-dashed border-[#F472B6]/30 text-gray-400'
                    } ${
                      isLegal && isTurn
                        ? 'ring-4 ring-white scale-110 animate-bounce cursor-pointer z-20'
                        : ''
                    }`}
                  >
                    {inBase ? (
                      <div className="flex flex-col items-center">
                        <span className="text-xs">✨</span>
                        <span className="text-[9px] font-bold text-white">N1</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-[#F472B6]">out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================= CENTER 3x3 FINISH TRIANGLES (rows 6..8, cols 6..8) ================= */}
          <div
            className="col-start-7 col-end-10 row-start-7 row-end-10 bg-[#29170E] border border-[#6B3A22] relative flex items-center justify-center z-10"
          >
            {/* Center Golden Star Crown Goal */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] border-2 border-[#FDE68A] flex flex-col items-center justify-center shadow-lg">
              <span className="text-sm">🏆</span>
              <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Goal</span>
            </div>

            {/* Badges for tokens that reached Goal */}
            <div className="absolute inset-0 flex items-center justify-around pointer-events-none p-1">
              {[0, 1].some((t) => isTokenInGoal(activeState.tokens[t], 0)) && (
                <div className="w-4 h-4 rounded-full bg-[#1E3A8A] border border-[#FDE68A] flex items-center justify-center text-[8px] text-white">
                  👑
                </div>
              )}
              {[2, 3].some((t) => isTokenInGoal(activeState.tokens[t], 1)) && (
                <div className="w-4 h-4 rounded-full bg-[#D81B60] border border-white flex items-center justify-center text-[8px] text-white">
                  ✨
                </div>
              )}
            </div>
          </div>

          {/* ================= 52 TRACK CELLS & HOME RUNWAYS ================= */}
          {Array.from({ length: 15 }, (_, r) =>
            Array.from({ length: 15 }, (_, c) => {
              // Skip corner quadrants and center 3x3 (handled above)
              const inTL = r < 6 && c < 6;
              const inTR = r < 6 && c >= 9;
              const inBL = r >= 9 && c < 6;
              const inBR = r >= 9 && c >= 9;
              const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

              if (inTL || inTR || inBL || inBR || inCenter) {
                return null;
              }

              // Check if track square
              const trackIdx = TRACK_COORDINATES.findIndex(
                (coord) => coord.r === r && coord.c === c
              );
              const isSafe = trackIdx !== -1 && SAFE_SQUARES.has(trackIdx);
              const isP0Entry = trackIdx === 0;
              const isP1Entry = trackIdx === 26;

              // Check if home runway square
              const isP0Home = c === 7 && r >= 1 && r <= 5;
              const isP1Home = c === 7 && r >= 9 && r <= 13;

              const presentTokens = cellTokens.get(`${r},${c}`) || [];

              return (
                <div
                  key={`${r}-${c}`}
                  style={{ gridColumnStart: c + 1, gridRowStart: r + 1 }}
                  className={`relative flex items-center justify-center text-[8px] font-bold select-none transition-colors ${
                    isP0Entry
                      ? 'bg-[#1E3A8A] text-white font-extrabold'
                      : isP1Entry
                      ? 'bg-[#D81B60] text-white font-extrabold'
                      : isP0Home
                      ? 'bg-[#2563EB] text-[#DBEAFE]'
                      : isP1Home
                      ? 'bg-[#DB2777] text-[#FCE7F3]'
                      : isSafe
                      ? 'bg-[#FDE68A] text-[#78350F]'
                      : (r + c) % 2 === 0
                      ? 'bg-[#FDFBF7] text-[#332211]'
                      : 'bg-[#F4ECE1] text-[#443322]'
                  }`}
                >
                  {/* Star Icon on Safe Squares */}
                  {isSafe && !isP0Entry && !isP1Entry && presentTokens.length === 0 && (
                    <span className="text-[10px] text-[#B45309]">★</span>
                  )}
                  {isP0Entry && presentTokens.length === 0 && <span>↓</span>}
                  {isP1Entry && presentTokens.length === 0 && <span>↑</span>}

                  {/* Render Pawns standing on this tile */}
                  {presentTokens.length > 0 && (
                    <div className="flex items-center justify-center -space-x-1 z-20">
                      {presentTokens.map((tIdx) => {
                        const isLegal = legalTokens.includes(tIdx);
                        const isP0 = tIdx < 2;
                        return (
                          <button
                            key={tIdx}
                            type="button"
                            disabled={!isLegal || (!isMyTurn && isOnline)}
                            onClick={() => handleSelectToken(tIdx)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md transition-all ${
                              isP0
                                ? 'bg-[#1E3A8A] border-[#FDE68A] text-white text-[10px]'
                                : 'bg-[#D81B60] border-white text-white text-[10px]'
                            } ${
                              isLegal
                                ? 'ring-4 ring-[#FDE68A] scale-125 animate-bounce z-30 cursor-pointer'
                                : ''
                            }`}
                            title={isP0 ? `${player1Name} Token` : `${player2Name} Token`}
                          >
                            {isP0 ? '👑' : '✨'}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= PHYSICAL DICE TRAY & CONTROLS ================= */}
      <div className="w-full max-w-sm flex flex-col gap-4 shrink-0">
        {/* Game Stats & Turn Status */}
        <div className="rounded-3xl bg-[#24131D] border-2 border-[#482839] p-4 text-[#FFF7FA] shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#E6B0C4] font-semibold">
                Couple’s Ludo · 2P
              </p>
              <p className="text-[11px] text-[#A67E8F]">15×15 Board · 8 Safe Stars</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = !muted;
                  gameAudio.muted = next;
                  setMuted(next);
                }}
                className="w-8 h-8 rounded-xl bg-[#321B28] hover:bg-[#432336] border border-[#542F44] flex items-center justify-center text-[#D8B4C2] transition-colors"
                title={muted ? 'Unmute sound' : 'Mute sound'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-8 h-8 rounded-xl bg-[#321B28] hover:bg-[#432336] border border-[#542F44] flex items-center justify-center text-[#D8B4C2] transition-colors"
                title="Restart Round"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Player Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className={`p-2.5 rounded-2xl border transition-all ${
                activeState.turnSeat === 0
                  ? 'bg-[#1E3A8A]/30 border-[#3B82F6] ring-2 ring-[#3B82F6]/50 shadow-md'
                  : 'bg-[#180E15] border-[#3B1F2E] opacity-75'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-[#1E3A8A] border border-[#FDE68A] flex items-center justify-center text-[10px]">
                  👑
                </span>
                <span className="text-xs font-semibold text-white truncate">{player1Name}</span>
              </div>
              <p className="text-[11px] text-[#BFDBFE]">
                Goal: {[0, 1].filter((t) => isTokenInGoal(activeState.tokens[t], 0)).length} / 2
              </p>
            </div>

            <div
              className={`p-2.5 rounded-2xl border transition-all ${
                activeState.turnSeat === 1
                  ? 'bg-[#D81B60]/20 border-[#D81B60] ring-2 ring-[#D81B60]/50 shadow-md'
                  : 'bg-[#180E15] border-[#3B1F2E] opacity-75'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-[#D81B60] border border-white flex items-center justify-center text-[10px]">
                  ✨
                </span>
                <span className="text-xs font-semibold text-white truncate">{player2Name}</span>
              </div>
              <p className="text-[11px] text-[#F9A8D4]">
                Goal: {[2, 3].filter((t) => isTokenInGoal(activeState.tokens[t], 1)).length} / 2
              </p>
            </div>
          </div>

          {/* Action Event Description */}
          <div className="mt-3 p-3 rounded-2xl bg-[#180E15] border border-[#3A1F2D] text-xs">
            <p className="font-semibold text-white mb-0.5">
              {activeState.winner !== null
                ? '🏆 Match Winner Declared!'
                : activeState.turnSeat === 0
                ? `${player1Name}’s Turn`
                : `${player2Name}’s Turn`}
            </p>
            <p className="text-[#DEC0CD] leading-snug">{activeState.lastAction}</p>
          </div>
        </div>

        {/* ================= WOODEN DICE CUP & ROLL BUTTON ================= */}
        <div className="rounded-3xl bg-[#281512] border-4 border-[#3D201A] p-5 shadow-2xl flex flex-col items-center justify-center gap-3">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#D4A373]">
            {activeState.phase === 'need_move' ? 'Select Token On Board' : 'Roll To Move'}
          </p>

          {/* 3D Dice Graphic */}
          <div
            className={`w-20 h-20 rounded-2xl bg-[#3E1A29] border-2 border-[#E5B2C5] flex items-center justify-center shadow-2xl transition-transform ${
              isRolling ? 'rotate-180 scale-95 duration-75' : 'hover:scale-105 duration-200'
            }`}
          >
            {renderDiceIcon(diceDisplay)}
          </div>

          {activeState.phase === 'need_roll' ? (
            <button
              type="button"
              disabled={isRolling || activeState.winner !== null || (!isMyTurn && isOnline)}
              onClick={() => executeRoll(activeState.turnSeat)}
              className={`w-full min-h-[52px] rounded-2xl font-semibold text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
                activeState.winner !== null
                  ? 'bg-[#3A1E2E] text-[#9E7B8B] cursor-not-allowed'
                  : !isMyTurn && isOnline
                  ? 'bg-[#3A1E2E] text-[#9E7B8B] cursor-not-allowed'
                  : activeState.turnSeat === 0
                  ? 'bg-[#1E3A8A] hover:bg-[#2563EB] text-white shadow-blue-900/50'
                  : 'bg-[#D81B60] hover:bg-[#BE1250] text-white shadow-pink-900/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isRolling
                  ? 'Rolling Dice...'
                  : activeState.winner !== null
                  ? 'Match Finished'
                  : !isMyTurn && isOnline
                  ? `Waiting for ${player2Name}...`
                  : botThinking
                  ? `${player2Name} is rolling...`
                  : `Roll Dice (${activeState.turnSeat === 0 ? player1Name : player2Name})`}
              </span>
            </button>
          ) : (
            <div className="w-full text-center p-3 rounded-2xl bg-[#1B0F15] border border-[#52293C]">
              <p className="text-xs font-semibold text-[#FDE68A] animate-pulse">
                👉 Click your highlighted token on the board to move!
              </p>
            </div>
          )}

          {activeState.consecutiveSixes > 0 && activeState.winner === null && (
            <p className="text-xs text-[#FDE68A] font-semibold animate-pulse text-center">
              🎲 Rolled a 6! Extra roll granted ({activeState.consecutiveSixes}/3)
            </p>
          )}
        </div>

        {/* Authentic Ludo Rules Summary */}
        <div className="rounded-2xl bg-[#1C0E16] border border-[#3E1E2E] p-3 text-[11px] text-[#DEC0CD] space-y-1">
          <p className="font-semibold text-white flex items-center gap-2">
            <span>★ 8 Safe Stars</span>
            <span className="text-[#8C6274]">·</span>
            <span>Capture = Bonus Roll</span>
          </p>
          <p className="text-[10px] text-[#A88594] leading-relaxed">
            Roll a 6 to bring a token out from the yard. Tokens on gold stars cannot be captured!
          </p>
        </div>
      </div>
    </div>
  );
}
