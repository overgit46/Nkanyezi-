import { useState, useEffect, useRef } from 'react';
import { GameRoomDoc } from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import {
  BattleshipState,
  BS_SIZE,
  createInitialBattleshipState,
  fireShotAtOpponent,
  generateRandomFleet,
  getSmartBattleshipBotShot,
  isValidPlacement,
  PlacedShip,
  SHIP_DEFS,
} from '../../games/battleshipLogic';

interface BattleshipArenaProps {
  room?: GameRoomDoc | null;
  userUid?: string | null;
  restartTrigger?: number;
  onScoreUpdate: (scores: { you: number; partner: number }) => void;
  onGameOver: (headline: string, subline: string) => void;
}

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function BattleshipArena({
  room,
  restartTrigger = 0,
  onScoreUpdate,
  onGameOver,
}: BattleshipArenaProps) {
  const [state, setState] = useState<BattleshipState>(() => {
    const s = createInitialBattleshipState();
    s.p0Ships = generateRandomFleet(); // Default ready fleet for convenience
    s.p1Ships = generateRandomFleet();
    return s;
  });
  const [playMode, setPlayMode] = useState<'solo' | 'twoPlayer'>(room ? 'twoPlayer' : 'solo');
  const [isBotFiring, setIsBotFiring] = useState(false);
  const [wins, setWins] = useState<{ you: number; partner: number }>({ you: 0, partner: 0 });
  const [statusMessage, setStatusMessage] = useState('Position your fleet or launch immediate naval battle!');

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

  // Handle Game Over
  useEffect(() => {
    if (state.winner !== null) {
      gameAudio.playWinFanfare();
      if (state.winner === 0) {
        setWins((w) => ({ ...w, you: w.you + 1 }));
        onGameOverRef.current('Fleet Victory! You Win!', 'All opposing naval vessels successfully neutralized!');
      } else {
        setWins((w) => ({ ...w, partner: w.partner + 1 }));
        onGameOverRef.current('Nkanyezi Sank Your Fleet!', 'Her naval targeting was razor-sharp!');
      }
    }
  }, [state.winner]);

  // Bot Turn in Solo Mode
  useEffect(() => {
    if (playMode === 'solo' && state.phase === 'battle' && state.turnSeat === 1 && state.winner === null && !isBotFiring) {
      setIsBotFiring(true);
      const timer = setTimeout(() => {
        const shot = getSmartBattleshipBotShot(state.p1Shots);
        const next = fireShotAtOpponent(state, shot.row, shot.col);
        if (next.lastShot?.result === 'hit' || next.lastShot?.result === 'sunk') {
          gameAudio.playCapture();
        } else {
          gameAudio.playStep();
        }
        setState(next);
        setIsBotFiring(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.turnSeat, state.winner, playMode, isBotFiring]);

  const handleReset = () => {
    const s = createInitialBattleshipState();
    s.p0Ships = generateRandomFleet();
    s.p1Ships = generateRandomFleet();
    setState(s);
    setStatusMessage('Position your fleet or launch immediate naval battle!');
  };

  const handleStartBattle = () => {
    if (state.p0Ships.length < 5) {
      setState((prev) => ({ ...prev, p0Ships: generateRandomFleet(), phase: 'battle' }));
    } else {
      setState((prev) => ({ ...prev, phase: 'battle' }));
    }
    setStatusMessage('Battle stations! Call coordinates on the radar grid to fire.');
  };

  const handleFireStrike = (row: number, col: number) => {
    if (state.phase !== 'battle' || state.winner !== null) return;
    if (playMode === 'solo' && state.turnSeat === 1) return;

    const coordKey = `${row},${col}`;
    const shots = state.turnSeat === 0 ? state.p0Shots : state.p1Shots;
    if (shots[coordKey]) return; // Already fired

    const next = fireShotAtOpponent(state, row, col);
    if (next.lastShot?.result === 'sunk') {
      gameAudio.playCapture();
      setStatusMessage(`Direct hit! You sank Nkanyezi’s ${next.lastShot.sunkShipName}!`);
    } else if (next.lastShot?.result === 'hit') {
      gameAudio.playCapture();
      setStatusMessage(`Direct hit at ${ROW_LABELS[row]}-${col + 1}!`);
    } else {
      gameAudio.playStep();
      setStatusMessage(`Splash! Miss at ${ROW_LABELS[row]}-${col + 1}.`);
    }
    setState(next);
  };

  const isShipAtCoord = (ships: PlacedShip[], r: number, c: number): boolean => {
    return ships.some((s) => {
      for (let i = 0; i < s.size; i++) {
        const sr = s.horizontal ? s.row : s.row + i;
        const sc = s.horizontal ? s.col + i : s.col;
        if (sr === r && sc === c) return true;
      }
      return false;
    });
  };

  const getSunkenCount = (ships: PlacedShip[]): number => {
    return ships.filter((s) => s.hits >= s.size).length;
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-start gap-5 py-2 px-3 text-[#FFF7FA]">
      {/* Control & Mode Header */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#131E2E] border border-[#1E314B] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlayMode('solo');
              handleReset();
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              playMode === 'solo'
                ? 'bg-[#0284C7] text-white shadow-md'
                : 'bg-[#0F172A] text-[#94A3B8] hover:text-white'
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
                ? 'bg-[#0284C7] text-white shadow-md'
                : 'bg-[#0F172A] text-[#94A3B8] hover:text-white'
            }`}
          >
            Two Players (Pass & Play)
          </button>
        </div>

        {/* Phase Action */}
        <div className="flex items-center gap-2">
          {state.phase === 'placement' ? (
            <button
              type="button"
              onClick={handleStartBattle}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-xs font-bold hover:brightness-110 shadow-md"
            >
              Confirm Fleet & Engage →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#CBD5E1]"
            >
              New Fleet
            </button>
          )}
        </div>
      </div>

      {/* Radar Terminal Status Banner */}
      <div className="w-full bg-[#0A121E] border border-[#16273D] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
        <span className="text-[#38BDF8] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
          {statusMessage}
        </span>
        <span className="text-[#94A3B8]">
          Enemy Sunk: <strong className="text-[#F43F5E]">{getSunkenCount(state.p1Ships)}/5</strong> | Own Sunk:{' '}
          <strong className="text-[#FBBF24]">{getSunkenCount(state.p0Ships)}/5</strong>
        </span>
      </div>

      {/* Dual Radar Consoles (Target Grid + Own Fleet Grid) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TARGET RADAR (Offensive Strike Grid) */}
        <div className="flex flex-col items-center bg-[#09111C] border-2 border-[#1E3653] p-3 sm:p-4 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold tracking-wider uppercase text-[#38BDF8] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
              Target Radar (Nkanyezi’s Waters)
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">
              {state.turnSeat === 0 ? 'READY TO STRIKE' : 'WAITING'}
            </span>
          </div>

          {/* Column Headers 1..10 */}
          <div className="grid grid-cols-11 w-full text-center text-[10px] font-mono text-[#64748B] mb-1">
            <span />
            {Array.from({ length: BS_SIZE }).map((_, i) => (
              <span key={`col-hdr-${i}`}>{i + 1}</span>
            ))}
          </div>

          {/* 10x10 Target Grid */}
          <div className="w-full flex flex-col gap-1">
            {Array.from({ length: BS_SIZE }).map((_, r) => (
              <div key={`target-row-${r}`} className="grid grid-cols-11 w-full gap-1 items-center">
                <span className="text-[10px] font-mono text-center text-[#64748B]">
                  {ROW_LABELS[r]}
                </span>
                {Array.from({ length: BS_SIZE }).map((_, c) => {
                  const key = `${r},${c}`;
                  const shot = state.p0Shots[key];
                  const isHit = shot === 'hit' || shot === 'sunk';
                  const isMiss = shot === 'miss';

                  return (
                    <button
                      key={`tgt-${r}-${c}`}
                      type="button"
                      disabled={!!shot || state.phase !== 'battle' || (playMode === 'solo' && state.turnSeat === 1)}
                      onClick={() => handleFireStrike(r, c)}
                      aria-label={`Strike ${ROW_LABELS[r]}-${c + 1}`}
                      className={`aspect-square rounded flex items-center justify-center border transition-all ${
                        isHit
                          ? 'bg-[#E11D48] border-[#FDA4AF] shadow-md shadow-rose-900/50 scale-95'
                          : isMiss
                          ? 'bg-[#1E293B] border-[#475569] text-[#94A3B8]'
                          : 'bg-[#0B1728] hover:bg-[#152B47] border-[#162B44] cursor-crosshair'
                      }`}
                    >
                      {isHit && <span className="text-white text-[10px] font-black">✕</span>}
                      {isMiss && <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* DEFENSE RADAR (Your Deployed Fleet) */}
        <div className="flex flex-col items-center bg-[#09111C] border-2 border-[#1E3653] p-3 sm:p-4 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold tracking-wider uppercase text-[#10B981] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              Defense Fleet (Your Ships)
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">
              {state.phase === 'placement' ? 'DEPLOYMENT' : 'ARMORED'}
            </span>
          </div>

          {/* Column Headers 1..10 */}
          <div className="grid grid-cols-11 w-full text-center text-[10px] font-mono text-[#64748B] mb-1">
            <span />
            {Array.from({ length: BS_SIZE }).map((_, i) => (
              <span key={`own-col-hdr-${i}`}>{i + 1}</span>
            ))}
          </div>

          {/* 10x10 Own Grid */}
          <div className="w-full flex flex-col gap-1">
            {Array.from({ length: BS_SIZE }).map((_, r) => (
              <div key={`own-row-${r}`} className="grid grid-cols-11 w-full gap-1 items-center">
                <span className="text-[10px] font-mono text-center text-[#64748B]">
                  {ROW_LABELS[r]}
                </span>
                {Array.from({ length: BS_SIZE }).map((_, c) => {
                  const hasShip = isShipAtCoord(state.p0Ships, r, c);
                  const key = `${r},${c}`;
                  const shotByEnemy = state.p1Shots[key];
                  const isHit = shotByEnemy === 'hit' || shotByEnemy === 'sunk';
                  const isMiss = shotByEnemy === 'miss';

                  return (
                    <div
                      key={`own-${r}-${c}`}
                      className={`aspect-square rounded flex items-center justify-center border transition-all ${
                        isHit
                          ? 'bg-[#E11D48] border-[#FDA4AF] animate-pulse'
                          : isMiss
                          ? 'bg-[#132030] border-[#334155]'
                          : hasShip
                          ? 'bg-[#0369A1] border-[#38BDF8] shadow-sm'
                          : 'bg-[#08121E] border-[#142335]'
                      }`}
                    >
                      {isHit && <span className="text-white text-[10px] font-black">🔥</span>}
                      {isMiss && <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />}
                      {!shotByEnemy && hasShip && (
                        <span className="w-2 h-2 rounded-sm bg-[#BAE6FD]" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet Manifest Legend */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 bg-[#0B1524] border border-[#162A43] p-3 rounded-2xl text-xs text-[#94A3B8]">
        {SHIP_DEFS.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-2.5 rounded bg-[#0284C7]" />
            <span>{s.name} ({s.size})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
