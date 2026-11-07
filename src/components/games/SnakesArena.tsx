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
  applySnakesMove,
  createInitialSnakesState,
  LADDERS,
  rollDiceValue,
  SNAKES,
  SnakesState,
} from '../../games/snakesLogic';
import { gameAudio } from '../../games/soundFx';
import { GameRoomDoc, updateRoomGameplay } from '../../firebase/roomService';
import { snakesStateFromMap, snakesStateToMap } from '../../games/roomStateCodec';

interface SnakesArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  player1Name?: string;
  player2Name?: string;
  onScoreUpdate?: (scores: { you: number; partner: number }) => void;
  onGameOver?: (winnerName: string, subline: string) => void;
  restartTrigger?: number;
}

// Convert tile number (1..100) to (x, y) coordinates on a 1000x1000 board
function getTileCenter(tile: number): { x: number; y: number } {
  const row = Math.floor((tile - 1) / 10);
  const col = row % 2 === 0 ? (tile - 1) % 10 : 9 - ((tile - 1) % 10);
  return {
    x: col * 100 + 50,
    y: (9 - row) * 100 + 50,
  };
}

export function SnakesArena({
  room,
  userUid,
  player1Name = 'You',
  player2Name = 'Nkanyezi',
  onScoreUpdate,
  onGameOver,
  restartTrigger = 0,
}: SnakesArenaProps) {
  const [localState, setLocalState] = useState<SnakesState>(createInitialSnakesState);
  const [isRolling, setIsRolling] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(1);
  const [highlightTile, setHighlightTile] = useState<number | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [muted, setMuted] = useState(gameAudio.muted);

  // Sync with Firestore room if connected
  const isOnline = Boolean(room);
  const activeState = room ? snakesStateFromMap(room.snakes, room.turnSeat) : localState;
  const isHost = !room || (userUid ? room.hostUid === userUid : true);
  const mySeat = isHost ? 0 : 1;
  const isMyTurn = !isOnline || activeState.turnSeat === mySeat;

  // Track scores and victory
  useEffect(() => {
    if (activeState.winner !== null) {
      const winnerName = activeState.winner === 0 ? player1Name : player2Name;
      onGameOver?.(
        `${winnerName} Wins on Tile 100!`,
        activeState.winner === mySeat
          ? 'Victory! You climbed past every obstacle to the golden crown!'
          : `${winnerName} reached the final star!`
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
    const fresh = createInitialSnakesState();
    if (room) {
      await updateRoomGameplay(room.roomCode, {
        activeGame: 'snakes',
        turnSeat: 0,
        snakes: snakesStateToMap(fresh),
        roomStatus: room.guestUid ? 'playing' : 'waiting',
      });
    } else {
      setLocalState(fresh);
    }
    setHighlightTile(null);
  };

  // Bot response in local single player mode
  useEffect(() => {
    if (isOnline) return;
    if (localState.turnSeat === 1 && localState.winner === null && !botThinking) {
      setBotThinking(true);
      const timer = window.setTimeout(() => {
        executeRoll(1);
        setBotThinking(false);
      }, 900);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localState.turnSeat, localState.winner, isOnline]);

  const executeRoll = async (seatToRoll: 0 | 1) => {
    if (isRolling || activeState.winner !== null) return;

    setIsRolling(true);
    gameAudio.playDiceRoll();

    let ticks = 0;
    const interval = window.setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1);
      ticks++;
      if (ticks > 7) {
        window.clearInterval(interval);
        const finalRoll = rollDiceValue();
        setDiceDisplay(finalRoll);

        const currentTurn = activeState.turnSeat;
        const resolution = applySnakesMove(
          activeState,
          finalRoll,
          player1Name,
          player2Name
        );

        const destPos =
          currentTurn === 0 ? resolution.nextState.p1Pos : resolution.nextState.p2Pos;
        setHighlightTile(destPos);

        if (resolution.landedSpecial?.kind === 'ladder') {
          gameAudio.playLadderClimb();
        } else if (resolution.landedSpecial?.kind === 'snake') {
          gameAudio.playSnakeSlide();
        } else if (resolution.won) {
          gameAudio.playWinFanfare();
          onScoreUpdate?.({
            you: resolution.nextState.winner === 0 ? 1 : 0,
            partner: resolution.nextState.winner === 1 ? 1 : 0,
          });
        } else {
          gameAudio.playStep();
        }

        if (room) {
          updateRoomGameplay(room.roomCode, {
            turnSeat: resolution.nextState.turnSeat,
            snakes: snakesStateToMap(resolution.nextState),
            roomStatus: resolution.won ? 'round_over' : 'playing',
          }).catch(() => {});
        } else {
          setLocalState(resolution.nextState);
        }

        setIsRolling(false);
      }
    }, 55);
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

  // Precompute visual SVG overlays for all realistic physical ladders and snakes
  const visualLadders = useMemo(() => {
    return Object.values(LADDERS).map((spec) => {
      const from = getTileCenter(spec.from);
      const to = getTileCenter(spec.to);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Perpendicular offset for double wooden rails
      const railOffset = 9;
      const nx = -Math.sin(angle) * railOffset;
      const ny = Math.cos(angle) * railOffset;

      // Generate rungs along the ladder length
      const rungCount = Math.max(3, Math.floor(len / 35));
      const rungs = [];
      for (let i = 1; i <= rungCount; i++) {
        const t = i / (rungCount + 1);
        const rx = from.x + dx * t;
        const ry = from.y + dy * t;
        rungs.push({
          x1: rx - nx * 0.9,
          y1: ry - ny * 0.9,
          x2: rx + nx * 0.9,
          y2: ry + ny * 0.9,
        });
      }

      return {
        key: `ladder-${spec.from}-${spec.to}`,
        from,
        to,
        rail1: {
          x1: from.x - nx,
          y1: from.y - ny,
          x2: to.x - nx,
          y2: to.y - ny,
        },
        rail2: {
          x1: from.x + nx,
          y1: from.y + ny,
          x2: to.x + nx,
          y2: to.y + ny,
        },
        rungs,
      };
    });
  }, []);

  const visualSnakes = useMemo(() => {
    return Object.values(SNAKES).map((spec, idx) => {
      const head = getTileCenter(spec.from);
      const tail = getTileCenter(spec.to);
      const dx = tail.x - head.x;
      const dy = tail.y - head.y;
      const midX = (head.x + tail.x) / 2;
      const midY = (head.y + tail.y) / 2;

      // Sinuous curvature perpendicular to line
      const archSign = idx % 2 === 0 ? 1 : -1;
      const perpX = -dy * 0.25 * archSign;
      const perpY = dx * 0.25 * archSign;

      const cp1X = head.x + dx * 0.3 + perpX;
      const cp1Y = head.y + dy * 0.3 + perpY;
      const cp2X = head.x + dx * 0.7 - perpX;
      const cp2Y = head.y + dy * 0.7 - perpY;

      const pathData = `M ${head.x} ${head.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tail.x} ${tail.y}`;

      return {
        key: `snake-${spec.from}-${spec.to}`,
        head,
        tail,
        pathData,
        strokeColor: idx % 2 === 0 ? '#10B981' : '#F43F5E',
        underColor: idx % 2 === 0 ? '#047857' : '#9F1239',
      };
    });
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 py-2 select-none">
      {/* ================= REAL PHYSICAL BOARD CONTAINER ================= */}
      <div className="relative w-full max-w-[500px] aspect-square rounded-[32px] bg-[#1F110B] p-2.5 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-[8px] sm:border-[12px] border-[#381E15] flex flex-col justify-between overflow-hidden shrink-0">
        {/* Brass Vintage Corner Accents */}
        <div className="absolute top-1 left-1 w-6 h-6 border-t-2 border-l-2 border-[#FDE68A]/60 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-1 right-1 w-6 h-6 border-t-2 border-r-2 border-[#FDE68A]/60 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-6 h-6 border-b-2 border-l-2 border-[#FDE68A]/60 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-6 h-6 border-b-2 border-r-2 border-[#FDE68A]/60 rounded-br-lg pointer-events-none" />

        {/* 10x10 Tile Grid: Authentic Cream & Almond Checkered Tiles */}
        <div className="relative grid grid-rows-10 h-full w-full gap-[2px] rounded-2xl overflow-hidden bg-[#2D180F]">
          {Array.from({ length: 10 }, (_, rowRevIdx) => {
            const rowIdx = 9 - rowRevIdx; // 9 is top row (91-100), 0 is bottom row (1-10)
            return (
              <div key={rowIdx} className="grid grid-cols-10 gap-[2px] h-full">
                {Array.from({ length: 10 }, (_, colIdx) => {
                  const tileNum =
                    rowIdx % 2 === 0
                      ? rowIdx * 10 + colIdx + 1
                      : rowIdx * 10 + (9 - colIdx) + 1;

                  const isLadderStart = LADDERS[tileNum];
                  const isSnakeStart = SNAKES[tileNum];
                  const isHighlit = highlightTile === tileNum;
                  const isEven = (rowIdx + colIdx) % 2 === 0;

                  return (
                    <div
                      key={tileNum}
                      className={`relative flex flex-col justify-between p-1 text-[10px] transition-all select-none ${
                        tileNum === 100
                          ? 'bg-gradient-to-br from-[#F59E0B] via-[#D81B60] to-[#991B1B] text-white shadow-inner font-bold'
                          : isHighlit
                          ? 'bg-[#FDE68A] text-[#1F110B] font-bold ring-2 ring-[#D81B60] z-10'
                          : isLadderStart
                          ? 'bg-[#EBF7EE] text-[#064E3B]'
                          : isSnakeStart
                          ? 'bg-[#FDF2F4] text-[#881337]'
                          : isEven
                          ? 'bg-[#FAF6F0] text-[#3E271E]'
                          : 'bg-[#F0E6D8] text-[#4A3226]'
                      }`}
                      title={
                        isLadderStart
                          ? `Ladder to ${isLadderStart.to}: ${isLadderStart.label}`
                          : isSnakeStart
                          ? `Snake down to ${isSnakeStart.to}: ${isSnakeStart.label}`
                          : `Tile ${tileNum}`
                      }
                    >
                      {/* Serif Tile Number */}
                      <span className="font-editorial text-[9px] sm:text-[11px] font-bold leading-none opacity-85">
                        {tileNum}
                      </span>

                      {/* Small Goal Crown on 100 */}
                      {tileNum === 100 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                          <span className="text-xl sm:text-2xl">👑</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ================= SVG LAYER: REALISTIC LADDERS & SNAKES ================= */}
          <svg
            viewBox="0 0 1000 1000"
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          >
            <defs>
              <filter id="woodShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.55" />
              </filter>
              <linearGradient id="ladderRail" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F5D0A9" />
                <stop offset="50%" stopColor="#C68A4C" />
                <stop offset="100%" stopColor="#875323" />
              </linearGradient>
            </defs>

            {/* Render 3D Wooden Ladders with Rails & Rungs */}
            {visualLadders.map((lad) => (
              <g key={lad.key} filter="url(#woodShadow)">
                {/* Rails */}
                <line
                  x1={lad.rail1.x1}
                  y1={lad.rail1.y1}
                  x2={lad.rail1.x2}
                  y2={lad.rail1.y2}
                  stroke="url(#ladderRail)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <line
                  x1={lad.rail2.x1}
                  y1={lad.rail2.y1}
                  x2={lad.rail2.x2}
                  y2={lad.rail2.y2}
                  stroke="url(#ladderRail)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                {/* Rungs */}
                {lad.rungs.map((r, ri) => (
                  <line
                    key={ri}
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                    stroke="#DDB178"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            ))}

            {/* Render Curving Scaled Snakes with Realistic Heads & Tails */}
            {visualSnakes.map((snk) => (
              <g key={snk.key} filter="url(#woodShadow)">
                {/* Snake Body Drop Shadow & Base */}
                <path
                  d={snk.pathData}
                  fill="none"
                  stroke={snk.underColor}
                  strokeWidth="15"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                {/* Snake Patterned Body */}
                <path
                  d={snk.pathData}
                  fill="none"
                  stroke={snk.strokeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="8 6"
                />
                {/* Snake Head at Start Tile */}
                <circle cx={snk.head.x} cy={snk.head.y} r="12" fill={snk.underColor} />
                <circle cx={snk.head.x} cy={snk.head.y} r="10" fill={snk.strokeColor} />
                <circle cx={snk.head.x - 3} cy={snk.head.y - 3} r="2.5" fill="#FFF" />
                <circle cx={snk.head.x + 3} cy={snk.head.y - 3} r="2.5" fill="#FFF" />
                <circle cx={snk.head.x - 3} cy={snk.head.y - 3} r="1.2" fill="#000" />
                <circle cx={snk.head.x + 3} cy={snk.head.y - 3} r="1.2" fill="#000" />
                {/* Snake Tail at End Tile */}
                <circle cx={snk.tail.x} cy={snk.tail.y} r="5" fill={snk.underColor} />
              </g>
            ))}

            {/* ================= PHYSICAL 3D TURNED PAWNS ================= */}
            {/* Player 1 Pawn (Navy & Gold Crest) */}
            {(() => {
              const c = getTileCenter(activeState.p1Pos);
              const isTogether = activeState.p1Pos === activeState.p2Pos;
              const px = isTogether ? c.x - 14 : c.x;
              const py = c.y;
              return (
                <g filter="url(#woodShadow)" className="transition-all duration-300">
                  <ellipse cx={px} cy={py + 14} rx="16" ry="6" fill="rgba(0,0,0,0.4)" />
                  {/* Pawn Conical Body */}
                  <path
                    d={`M ${px - 14} ${py + 12} L ${px - 7} ${py - 6} L ${px + 7} ${py - 6} L ${px + 14} ${py + 12} Z`}
                    fill="url(#ladderRail)"
                  />
                  <path
                    d={`M ${px - 14} ${py + 12} L ${px - 7} ${py - 6} L ${px + 7} ${py - 6} L ${px + 14} ${py + 12} Z`}
                    fill="#1E3A8A"
                    opacity="0.9"
                  />
                  {/* Pawn Head Sphere */}
                  <circle cx={px} cy={py - 12} r="11" fill="#1D4ED8" stroke="#FDE68A" strokeWidth="2" />
                  <circle cx={px - 3} cy={py - 15} r="3" fill="#93C5FD" opacity="0.8" />
                  {/* Crown Icon */}
                  <text x={px} y={py - 8} fontSize="11" textAnchor="middle" fill="#FDE68A">
                    👑
                  </text>
                </g>
              );
            })()}

            {/* Player 2 Pawn: Nkanyezi (Rose Gold & Star Crest) */}
            {(() => {
              const c = getTileCenter(activeState.p2Pos);
              const isTogether = activeState.p1Pos === activeState.p2Pos;
              const px = isTogether ? c.x + 14 : c.x;
              const py = c.y;
              return (
                <g filter="url(#woodShadow)" className="transition-all duration-300">
                  <ellipse cx={px} cy={py + 14} rx="16" ry="6" fill="rgba(0,0,0,0.4)" />
                  {/* Pawn Conical Body */}
                  <path
                    d={`M ${px - 14} ${py + 12} L ${px - 7} ${py - 6} L ${px + 7} ${py - 6} L ${px + 14} ${py + 12} Z`}
                    fill="#9F1239"
                  />
                  {/* Pawn Head Sphere */}
                  <circle cx={px} cy={py - 12} r="11" fill="#D81B60" stroke="#FFF" strokeWidth="2" />
                  <circle cx={px - 3} cy={py - 15} r="3" fill="#FFB4D1" opacity="0.8" />
                  {/* Star Icon */}
                  <text x={px} y={py - 8} fontSize="11" textAnchor="middle" fill="#FFF">
                    ✨
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* ================= PHYSICAL DICE TRAY & CONTROLS ================= */}
      <div className="w-full max-w-sm flex flex-col gap-4 shrink-0">
        {/* Game Info & Mute / Reset Bar */}
        <div className="rounded-3xl bg-[#24131D] border-2 border-[#482839] p-4 text-[#FFF7FA] shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#E6B0C4] font-semibold">
                Snakes & Ladders · 2P
              </p>
              <p className="text-[11px] text-[#A67E8F]">Couple’s 100-Square Board</p>
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
              <p className="font-mono text-base font-bold text-[#FDE68A]">
                Tile {activeState.p1Pos}
                <span className="text-xs text-[#9E7B8B] font-normal"> / 100</span>
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
              <p className="font-mono text-base font-bold text-[#F4A8C4]">
                Tile {activeState.p2Pos}
                <span className="text-xs text-[#9E7B8B] font-normal"> / 100</span>
              </p>
            </div>
          </div>

          {/* Action Log / Narrative Message */}
          <div className="mt-3 p-3 rounded-2xl bg-[#180E15] border border-[#3A1F2D] text-xs">
            <p className="font-semibold text-white mb-0.5">
              {activeState.winner !== null
                ? '🏆 Match Winner Declared!'
                : activeState.turnSeat === 0
                ? `${player1Name}’s Turn`
                : `${player2Name}’s Turn`}
            </p>
            <p className="text-[#DEC0CD] leading-snug">{activeState.lastEvent}</p>
          </div>
        </div>

        {/* ================= WOODEN DICE CUP & ROLL BUTTON ================= */}
        <div className="rounded-3xl bg-[#281512] border-4 border-[#3D201A] p-5 shadow-2xl flex flex-col items-center justify-center gap-3">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#D4A373]">
            Roll To Advance
          </p>

          {/* 3D Dice Graphic */}
          <div
            className={`w-20 h-20 rounded-2xl bg-[#3E1A29] border-2 border-[#E5B2C5] flex items-center justify-center shadow-2xl transition-transform ${
              isRolling ? 'rotate-180 scale-95 duration-75' : 'hover:scale-105 duration-200'
            }`}
          >
            {renderDiceIcon(diceDisplay)}
          </div>

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
                ? 'Round Complete'
                : !isMyTurn && isOnline
                ? `Waiting for ${player2Name}...`
                : botThinking
                ? `${player2Name} is rolling...`
                : `Roll Dice (${activeState.turnSeat === 0 ? player1Name : player2Name})`}
            </span>
          </button>

          {activeState.consecutiveSixes > 0 && activeState.winner === null && (
            <p className="text-xs text-[#FDE68A] font-semibold animate-pulse text-center">
              🎲 Rolled a 6! Extra roll granted ({activeState.consecutiveSixes}/3)
            </p>
          )}
        </div>

        {/* Authentic Board Game Rules Summary */}
        <div className="rounded-2xl bg-[#1C0E16] border border-[#3E1E2E] p-3 text-[11px] text-[#DEC0CD] space-y-1">
          <p className="font-semibold text-white flex items-center gap-2">
            <span>🪜 Ladders: Climb Up</span>
            <span className="text-[#8C6274]">·</span>
            <span>🐍 Snakes: Slide Down</span>
          </p>
          <p className="text-[10px] text-[#A88594] leading-relaxed">
            Exact roll required on Tile 100 (overshooting bounces back). Roll a 6 to roll again!
          </p>
        </div>
      </div>
    </div>
  );
}
