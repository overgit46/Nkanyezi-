import { useEffect, useState } from 'react';
import {
  applyTttMove,
  chooseSmartTttBotMove,
  createInitialTttState,
  getFadingCellIndex,
  TttMode,
  TttState,
} from '../../games/ticTacToeLogic';
import {
  GameRoomDoc,
  tttStateFromRoom,
  tttStateToMap,
  updateRoomGameplay,
} from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';

interface TicTacToeArenaProps {
  room: GameRoomDoc | null;
  currentUid: string | null;
  paused: boolean;
  restartNonce: number;
  onScoreChange: (youScore: number, partnerScore: number) => void;
  onMatchEnd: (headline: string, subline: string) => void;
}

export function TicTacToeArena({
  room,
  currentUid,
  paused,
  restartNonce,
  onScoreChange,
  onMatchEnd,
}: TicTacToeArenaProps) {
  const isOnline = Boolean(room && currentUid);
  const isHost = Boolean(room && currentUid && room.hostUid === currentUid);

  const [localOpponent, setLocalOpponent] = useState<'bot' | 'couch'>('bot');
  const [localState, setLocalState] = useState<TttState>(() =>
    createInitialTttState('bolt', 'X')
  );
  const [localScores, setLocalScores] = useState<{ x: number; o: number }>({ x: 0, o: 0 });

  // Reset local round when HUD Restart [R] is pressed
  useEffect(() => {
    if (restartNonce === 0) return;
    if (isOnline && room) {
      const next = createInitialTttState(room.ttt.mode, 'X');
      updateRoomGameplay(room.roomCode, {
        ttt: tttStateToMap(next),
        turnSeat: 0,
        roomStatus: room.guestUid ? 'playing' : 'waiting',
      }).catch(() => {});
    } else {
      setLocalState((prev) => createInitialTttState(prev.mode, 'X'));
    }
  }, [restartNonce]);

  // Derive active board state from online room or local state
  const derivedOnlineState: TttState | null =
    isOnline && room ? tttStateFromRoom(room) : null;

  const activeState = derivedOnlineState ?? localState;

  // Report score updates to HUD
  useEffect(() => {
    if (isOnline && room) {
      if (isHost) {
        onScoreChange(room.hostScore, room.guestScore);
      } else {
        onScoreChange(room.guestScore, room.hostScore);
      }
    } else {
      onScoreChange(localScores.x, localScores.o);
    }
  }, [isOnline, isHost, room?.hostScore, room?.guestScore, localScores.x, localScores.o]);

  // Smart bot automatic move in local vs Bot mode
  useEffect(() => {
    if (isOnline || localOpponent !== 'bot' || paused) return;
    if (localState.winner !== '' || localState.turn !== 'O') return;

    const timer = window.setTimeout(() => {
      const botIdx = chooseSmartTttBotMove(localState);
      if (botIdx === -1) return;
      const next = applyTttMove(localState, botIdx);
      gameAudio.playTilePlace(false);
      setLocalState(next);

      if (next.winner === 'O') {
        setLocalScores((prev) => ({ ...prev, o: prev.o + 1 }));
        onMatchEnd('Smart Bot Takes the Round', 'Three O marks aligned on the board.');
      } else if (next.winner === 'draw') {
        onMatchEnd('Deadlock Draw', 'Try Bolt 3-Piece mode so pieces cycle and draws become impossible!');
      }
    }, 460);

    return () => window.clearTimeout(timer);
  }, [isOnline, localOpponent, paused, localState]);

  const myMark: 'X' | 'O' = isOnline ? (isHost ? 'X' : 'O') : localState.turn;
  const canClickBoard =
    !paused &&
    activeState.winner === '' &&
    (isOnline
      ? Boolean(room?.guestUid) && activeState.turn === myMark
      : localOpponent === 'couch' || localState.turn === 'X');

  const fadingX = getFadingCellIndex(activeState, 'X');
  const fadingO = getFadingCellIndex(activeState, 'O');

  const handleCellSelect = async (idx: number) => {
    if (!canClickBoard || activeState.board[idx] !== '') return;

    const next = applyTttMove(activeState, idx);
    gameAudio.playTilePlace(activeState.turn === 'X');

    if (isOnline && room) {
      const xWon = next.winner === 'X';
      const oWon = next.winner === 'O';
      if (xWon || oWon) {
        gameAudio.playWinFanfare();
      }
      await updateRoomGameplay(room.roomCode, {
        ttt: tttStateToMap(next),
        turnSeat: next.turn === 'X' ? 0 : 1,
        hostScore: xWon ? room.hostScore + 1 : room.hostScore,
        guestScore: oWon ? room.guestScore + 1 : room.guestScore,
        roomStatus: next.winner !== '' ? 'round_over' : room.guestUid ? 'playing' : 'waiting',
      });
      return;
    }

    setLocalState(next);
    if (next.winner === 'X') {
      gameAudio.playWinFanfare();
      setLocalScores((prev) => ({ ...prev, x: prev.x + 1 }));
      onMatchEnd(
        localOpponent === 'couch' ? 'Player X Wins the Round!' : 'You Won the Round!',
        'Clean 3-in-a-row alignment.'
      );
    } else if (next.winner === 'O') {
      gameAudio.playWinFanfare();
      setLocalScores((prev) => ({ ...prev, o: prev.o + 1 }));
      onMatchEnd('Nkanyezi (O) Wins the Round!', 'Clean 3-in-a-row alignment.');
    } else if (next.winner === 'draw') {
      onMatchEnd('Classic Draw', 'Switch to Bolt 3-Piece mode for endless draw-free rallies.');
    }
  };

  const handleSwitchMode = async (mode: TttMode) => {
    const fresh = createInitialTttState(mode, 'X');
    if (isOnline && room) {
      await updateRoomGameplay(room.roomCode, {
        ttt: tttStateToMap(fresh),
        turnSeat: 0,
        roomStatus: room.guestUid ? 'playing' : 'waiting',
      });
    } else {
      setLocalState(fresh);
    }
  };

  const handleNextOnlineRound = async () => {
    if (!isOnline || !room) {
      setLocalState((prev) => createInitialTttState(prev.mode, 'X'));
      return;
    }
    const fresh = createInitialTttState(room.ttt.mode, room.roundNumber % 2 === 1 ? 'O' : 'X');
    await updateRoomGameplay(room.roomCode, {
      roundNumber: room.roundNumber + 1,
      ttt: tttStateToMap(fresh),
      turnSeat: fresh.turn === 'X' ? 0 : 1,
      roomStatus: room.guestUid ? 'playing' : 'waiting',
    });
  };

  const xLabel = isOnline && room ? room.hostName || 'Host' : 'You (X)';
  const oLabel =
    isOnline && room
      ? room.guestName || 'Waiting for Nkanyezi...'
      : localOpponent === 'bot'
        ? 'Smart Bot (O)'
        : 'Nkanyezi (O)';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 py-3 sm:py-4 px-3 max-w-xl mx-auto">
      {/* Mode & Opponent Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-[#23171D] border border-[#3E2833] rounded-2xl p-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Tic-Tac-Toe rules">
          <button
            type="button"
            onClick={() => handleSwitchMode('bolt')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeState.mode === 'bolt'
                ? 'bg-[#D81B60] text-white'
                : 'text-[#D6B8C4] hover:text-white hover:bg-[#312029]'
            }`}
          >
            Bolt · 3-Piece
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('classic')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeState.mode === 'classic'
                ? 'bg-[#D81B60] text-white'
                : 'text-[#D6B8C4] hover:text-white hover:bg-[#312029]'
            }`}
          >
            Classic · 3×3
          </button>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Opponent mode">
            <button
              type="button"
              onClick={() => {
                setLocalOpponent('bot');
                setLocalState(createInitialTttState(activeState.mode, 'X'));
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                localOpponent === 'bot'
                  ? 'bg-[#F4D3DF] text-[#26131B]'
                  : 'text-[#D6B8C4] hover:text-white hover:bg-[#312029]'
              }`}
            >
              vs Smart Bot
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalOpponent('couch');
                setLocalState(createInitialTttState(activeState.mode, 'X'));
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                localOpponent === 'couch'
                  ? 'bg-[#F4D3DF] text-[#26131B]'
                  : 'text-[#D6B8C4] hover:text-white hover:bg-[#312029]'
              }`}
            >
              Pass & Play
            </button>
          </div>
        )}
      </div>

      {/* Turn Banner */}
      <div className="text-center my-2">
        <p className="text-xs uppercase tracking-widest text-[#C9A3B2]">
          {activeState.mode === 'bolt'
            ? 'Each player holds max 3 marks · 4th mark lifts your oldest'
            : 'Classic 3-in-a-row alignment'}
        </p>
        <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#FFF7FA] mt-1">
          {isOnline && room && !room.guestUid
            ? `Room ${room.roomCode} ready — share code with Nkanyezi`
            : activeState.winner === 'X'
              ? `${xLabel} Won!`
              : activeState.winner === 'O'
                ? `${oLabel} Won!`
                : activeState.winner === 'draw'
                  ? 'Round Drawn'
                  : activeState.turn === 'X'
                    ? `${xLabel}’s Turn`
                    : `${oLabel}’s Turn`}
        </h2>
      </div>

      {/* Tactile 3x3 Luxury Grid */}
      <div
        role="grid"
        aria-label="Tic-Tac-Toe board"
        className="grid grid-cols-3 gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-3xl bg-[#26181F] border-2 border-[#462D39] shadow-xl w-full max-w-[340px] aspect-square"
      >
        {activeState.board.map((cell, idx) => {
          const isWinningCell = activeState.winningLine?.includes(idx) ?? false;
          const isFadingNext =
            (activeState.turn === 'X' && fadingX === idx) ||
            (activeState.turn === 'O' && fadingO === idx);
          const row = Math.floor(idx / 3) + 1;
          const col = (idx % 3) + 1;

          return (
            <button
              key={idx}
              type="button"
              disabled={!canClickBoard || cell !== ''}
              onClick={() => handleCellSelect(idx)}
              aria-label={`Row ${row} Column ${col}${cell ? `, marked ${cell}` : ', empty'}`}
              className={`relative rounded-2xl flex items-center justify-center transition-all duration-150 select-none ${
                isWinningCell
                  ? 'bg-[#D81B60] border-2 border-[#FFD1E1] scale-[1.02]'
                  : cell === ''
                    ? canClickBoard
                      ? 'bg-[#33202A] hover:bg-[#3F2834] border border-[#4D3240] cursor-pointer active:scale-95'
                      : 'bg-[#2C1C24] border border-[#3D2732] cursor-default'
                    : 'bg-[#36222C] border border-[#563847]'
              }`}
            >
              {cell === 'X' && (
                <svg
                  viewBox="0 0 48 48"
                  className={`w-11 h-11 sm:w-14 sm:h-14 transition-opacity ${
                    isWinningCell
                      ? 'text-white'
                      : isFadingNext
                        ? 'text-[#FF85AD] opacity-45'
                        : 'text-[#FF6B9D]'
                  }`}
                  aria-hidden="true"
                >
                  <path
                    d="M12 12L36 36M36 12L12 36"
                    stroke="currentColor"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {cell === 'O' && (
                <svg
                  viewBox="0 0 48 48"
                  className={`w-11 h-11 sm:w-14 sm:h-14 transition-opacity ${
                    isWinningCell
                      ? 'text-white'
                      : isFadingNext
                        ? 'text-[#FDE68A] opacity-45'
                        : 'text-[#FBBF24]'
                  }`}
                  aria-hidden="true"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5.5"
                  />
                </svg>
              )}
              {isFadingNext && (
                <span className="absolute bottom-1.5 text-[9px] font-bold uppercase tracking-wider text-[#F7C6D7]">
                  Next Lift
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Round Controls */}
      <div className="w-full flex items-center justify-between gap-3 mt-2 pt-2">
        <div className="text-xs text-[#C9A3B2]">
          <span>{xLabel}</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>{oLabel}</span>
        </div>

        {activeState.winner !== '' && (
          <button
            type="button"
            onClick={handleNextOnlineRound}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            Next Round
          </button>
        )}
      </div>
    </div>
  );
}
