/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import {
  CardCode,
  CardTableState,
  CardVariant,
  chooseBotCardAction,
  createCardGame,
  drawFromStockMove,
  isCardPlayable,
  playCardMove,
  Suit,
  SUIT_NAMES,
  SUIT_SYMBOLS,
  SUITS,
} from '../../games/cardGamesLogic';
import {
  cardStateFromRoom,
  cardStateToRoomFields,
  GameRoomDoc,
  updateRoomGameplay,
} from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import { PlayingCardView } from './PlayingCardView';
import { Sparkles, Trophy } from 'lucide-react';

interface CardLoungeTableProps {
  room: GameRoomDoc | null;
  currentUid: string | null;
  paused: boolean;
  restartNonce: number;
  onScoreChange: (youScore: number, partnerScore: number) => void;
  onMatchEnd: (headline: string, subline: string) => void;
}

export function CardLoungeTable({
  room,
  currentUid,
  paused,
  restartNonce,
  onScoreChange,
  onMatchEnd,
}: CardLoungeTableProps) {
  const isOnline = Boolean(room && currentUid);
  const isHost = Boolean(room && currentUid && room.hostUid === currentUid);
  // In online mode: Host sits at Seat 0 (South), Guest sits at Seat 2 (North), Bots sit at Seats 1 & 3 in 4P
  const mySeat = isOnline ? (isHost ? 0 : 2) : 0;

  const [localTable, setLocalTable] = useState<CardTableState>(() =>
    createCardGame('crazy8', 4)
  );
  const [localWins, setLocalWins] = useState<{ you: number; table: number }>({
    you: 0,
    table: 0,
  });
  const [pendingWildCard, setPendingWildCard] = useState<CardCode | null>(null);

  const activeTable: CardTableState =
    isOnline && room ? cardStateFromRoom(room) : localTable;

  // Seat display names rotated relative to viewer
  const getSeatName = (seat: number): string => {
    if (isOnline && room) {
      if (seat === 0) return room.hostName || 'Host';
      if (seat === 2) return room.guestName || 'Nkanyezi';
      return seat === 1 ? 'Lindi (Bot)' : 'Sipho (Bot)';
    }
    if (seat === 0) return 'You';
    if (seat === 1) return 'Zola (Bot)';
    if (seat === 2) return 'Nkanyezi (Bot)';
    return 'Sipho (Bot)';
  };

  const onScoreChangeRef = useRef(onScoreChange);
  onScoreChangeRef.current = onScoreChange;

  // Sync HUD score readout
  useEffect(() => {
    if (isOnline && room) {
      onScoreChangeRef.current(
        isHost ? room.hostScore : room.guestScore,
        isHost ? room.guestScore : room.hostScore
      );
    } else {
      onScoreChangeRef.current(localWins.you, localWins.table);
    }
  }, [isOnline, isHost, room?.hostScore, room?.guestScore, localWins.you, localWins.table]);

  // Handle Restart [R] from HUD
  useEffect(() => {
    if (restartNonce === 0) return;
    setPendingWildCard(null);
    const fresh = createCardGame(activeTable.variant, activeTable.seatCount);
    if (isOnline && room) {
      updateRoomGameplay(room.roomCode, {
        ...cardStateToRoomFields(fresh),
        roomStatus: room.guestUid ? 'playing' : 'waiting',
      }).catch(() => {});
    } else {
      setLocalTable(fresh);
    }
  }, [restartNonce]);

  // Automated smart bot turns
  useEffect(() => {
    if (paused || activeTable.winnerSeat !== -1) return;

    const turn = activeTable.turnSeat;
    const isBotSeat = isOnline
      ? Boolean(room?.guestUid) && (turn === 1 || turn === 3) && isHost
      : turn !== 0;

    if (!isBotSeat) return;

    const timer = window.setTimeout(() => {
      const botLabel = getSeatName(turn);
      const next = chooseBotCardAction(activeTable, turn, botLabel);
      gameAudio.playCardSnap();

      if (isOnline && room) {
        updateRoomGameplay(room.roomCode, {
          ...cardStateToRoomFields(next),
          roomStatus: next.winnerSeat !== -1 ? 'round_over' : 'playing',
        }).catch(() => {});
      } else {
        setLocalTable(next);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeTable, paused, isOnline, room, isHost]);

  // Match ending victory announcement
  useEffect(() => {
    if (activeTable.winnerSeat === -1) return;

    const won = activeTable.winnerSeat === mySeat;
    const winnerName = getSeatName(activeTable.winnerSeat);

    if (won) {
      gameAudio.playWinFanfare();
      setLocalWins((prev) => ({ ...prev, you: prev.you + 1 }));
      onMatchEnd(
        'Card Lounge Champion!',
        activeTable.variant === 'hearts'
          ? `You took ${activeTable.trickScores[mySeat]} tricks to sweep the parlor table.`
          : 'You shed your final card and outmaneuvered the table!'
      );
    } else {
      gameAudio.playCardSnap();
      setLocalWins((prev) => ({ ...prev, table: prev.table + 1 }));
      onMatchEnd(
        `${winnerName} Sweeps the Table`,
        activeTable.variant === 'hearts'
          ? `${winnerName} took the decisive trick to claim the round.`
          : `${winnerName} played their last card first. Time for a rematch!`
      );
    }
  }, [activeTable.winnerSeat, mySeat]);

  const handlePlayCard = async (cardCode: CardCode) => {
    if (!isMyTurn) return;

    const parsed = {
      rank: cardCode.slice(0, -1),
      suit: cardCode.slice(-1) as Suit,
    };

    if (parsed.rank === '8' && activeTable.variant === 'crazy8') {
      setPendingWildCard(cardCode);
      return;
    }

    const next = playCardMove(activeTable, mySeat, cardCode, undefined, getSeatName(mySeat));
    gameAudio.playCardSnap();

    if (isOnline && room) {
      await updateRoomGameplay(room.roomCode, {
        ...cardStateToRoomFields(next),
        roomStatus: next.winnerSeat !== -1 ? 'round_over' : 'playing',
      });
    } else {
      setLocalTable(next);
    }
  };

  const handleSelectWildSuit = async (chosenSuit: Suit) => {
    if (!pendingWildCard) return;
    const cardCode = pendingWildCard;
    setPendingWildCard(null);

    const next = playCardMove(activeTable, mySeat, cardCode, chosenSuit, getSeatName(mySeat));
    gameAudio.playCardSnap();

    if (isOnline && room) {
      await updateRoomGameplay(room.roomCode, {
        ...cardStateToRoomFields(next),
        roomStatus: next.winnerSeat !== -1 ? 'round_over' : 'playing',
      });
    } else {
      setLocalTable(next);
    }
  };

  const handleDrawCard = async () => {
    if (!isMyTurn) return;

    const next = drawFromStockMove(activeTable, mySeat, getSeatName(mySeat));
    gameAudio.playCardSnap();

    if (isOnline && room) {
      await updateRoomGameplay(room.roomCode, {
        ...cardStateToRoomFields(next),
      });
    } else {
      setLocalTable(next);
    }
  };

  const handleVariantOrSeatsChange = async (variant: CardVariant, seatCount: 2 | 4) => {
    setPendingWildCard(null);
    const fresh = createCardGame(variant, seatCount);
    if (isOnline && room) {
      await updateRoomGameplay(room.roomCode, {
        ...cardStateToRoomFields(fresh),
        roomStatus: room.guestUid ? 'playing' : 'waiting',
      });
    } else {
      setLocalTable(fresh);
    }
  };

  // Relative seats around the table
  const northSeat = mySeat === 0 ? 2 : 0;
  const westSeat = mySeat === 0 ? 1 : 3;
  const eastSeat = mySeat === 0 ? 3 : 1;

  const myHand = activeTable.hands[mySeat] || [];
  const topDiscard = activeTable.discard[activeTable.discard.length - 1];
  const isMyTurn =
    activeTable.winnerSeat === -1 &&
    activeTable.turnSeat === mySeat &&
    (!isOnline || Boolean(room?.guestUid));

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col justify-start gap-4 px-2 sm:px-4 py-2 select-none">
      {/* ================= CARD LOUNGE CONTROLS BAR ================= */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0A2619] border border-[#1B4D36] rounded-2xl px-3 sm:px-4 py-2.5 shadow-lg">
        {/* Variant Switcher */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Card game variant">
          {(
            [
              { id: 'crazy8', label: 'Crazy Eights' },
              { id: 'switch', label: 'Action Switch' },
              { id: 'hearts', label: 'Hearts Trump' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleVariantOrSeatsChange(mode.id, activeTable.seatCount)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTable.variant === mode.id
                  ? 'bg-[#D81B60] text-white shadow-md'
                  : 'text-[#9FD1BA] hover:text-white hover:bg-[#153D2B]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* 2P vs 4P Toggle */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Player count">
          {([4, 2] as const).map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => handleVariantOrSeatsChange(activeTable.variant, count)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTable.seatCount === count
                  ? 'bg-[#FDE68A] text-[#1E1108] font-bold shadow-md'
                  : 'text-[#9FD1BA] hover:text-white hover:bg-[#153D2B]'
              }`}
            >
              {count} Players
            </button>
          ))}
        </div>
      </div>

      {/* ================= AUTHENTIC GREEN FELT CARD TABLE ================= */}
      <div className="relative w-full rounded-[40px] sm:rounded-[48px] bg-gradient-to-b from-[#0D3823] to-[#072416] border-[10px] sm:border-[16px] border-[#291711] shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-4 sm:p-6 flex flex-col justify-between overflow-hidden">
        {/* Stitched Brass Stud Accents along Leather Rim */}
        <div className="absolute top-2 left-4 flex gap-6 opacity-40 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FDE68A]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FDE68A]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FDE68A]" />
        </div>
        <div className="absolute top-2 right-4 flex gap-6 opacity-40 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FDE68A]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FDE68A]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FDE68A]" />
        </div>

        {/* Center Felt Watermark & Gold Betting Ring */}
        <div className="absolute inset-x-8 inset-y-12 rounded-[32px] border border-[#FDE68A]/15 pointer-events-none flex flex-col items-center justify-center">
          <p className="font-editorial text-sm sm:text-base font-semibold text-[#FDE68A]/20 uppercase tracking-[0.25em] text-center select-none">
            ♠ ♥ Nkanyezi & You · Private Card Lounge ♦ ♣
          </p>
        </div>

        {/* ================= NORTH SEAT (Opponent / Nkanyezi) ================= */}
        <div className="flex flex-col items-center z-10">
          <div
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
              activeTable.turnSeat === northSeat && activeTable.winnerSeat === -1
                ? 'bg-[#F59E0B] text-[#1D120B] ring-2 ring-[#FDE68A]'
                : 'bg-[#091F14]/90 text-[#CDE6DA] border border-[#1C4D35]'
            }`}
          >
            <span>✨ {getSeatName(northSeat)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {activeTable.hands[northSeat].length} cards
            </span>
            {activeTable.variant === 'hearts' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeTable.trickScores[northSeat]} tricks
                </span>
              </>
            )}
          </div>
          {/* Card Back Fan */}
          <div className="flex items-center justify-center -space-x-4 mt-2">
            {activeTable.hands[northSeat].slice(0, 7).map((_, i) => (
              <PlayingCardView key={i} faceDown size="xs" />
            ))}
          </div>
        </div>

        {/* ================= MIDDLE ROW: WEST / POT / EAST ================= */}
        <div className="grid grid-cols-12 items-center gap-2 my-4 z-10">
          {/* West Seat (in 4-player mode) */}
          <div className="col-span-3 flex flex-col items-start">
            {activeTable.seatCount === 4 && (
              <div className="flex flex-col items-start">
                <div
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold mb-1 shadow-md ${
                    activeTable.turnSeat === westSeat && activeTable.winnerSeat === -1
                      ? 'bg-[#F59E0B] text-[#1D120B] ring-2 ring-[#FDE68A]'
                      : 'bg-[#091F14]/90 text-[#CDE6DA] border border-[#1C4D35]'
                  }`}
                >
                  <span className="block truncate max-w-[80px]">{getSeatName(westSeat)}</span>
                  <span className="font-mono tabular-nums">{activeTable.hands[westSeat].length} left</span>
                </div>
                <div className="hidden sm:flex -space-x-5">
                  {activeTable.hands[westSeat].slice(0, 4).map((_, i) => (
                    <PlayingCardView key={i} faceDown size="xs" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Play Felt: Stock Pile + Discard / Trick Pot */}
          <div className="col-span-6 flex flex-col items-center justify-center">
            {activeTable.variant === 'hearts' ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#FDE68A]">
                  Hearts (♥) Trump All Suits
                </p>
                <div className="min-h-[96px] flex items-center justify-center gap-2">
                  {activeTable.trickPot.length === 0 ? (
                    <div className="px-4 py-3 rounded-2xl border border-dashed border-[#285D44] text-xs text-[#98C7B0] bg-[#0A2619]/60">
                      Lead a card to start trick
                    </div>
                  ) : (
                    activeTable.trickPot.map((entry) => {
                      const [seatStr, cCode] = entry.split(':');
                      return (
                        <div key={entry} className="flex flex-col items-center">
                          <PlayingCardView code={cCode as CardCode} size="sm" />
                          <span className="text-[10px] text-[#CDE6DA] mt-1">
                            {getSeatName(Number(seatStr)).split(' ')[0]}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-5 sm:gap-8">
                {/* 3D Stacked Deck of Cards */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {/* Visual thickness shadows under stock deck */}
                    <div className="absolute inset-0 translate-y-1.5 translate-x-1 rounded-xl bg-[#2D0A14] border border-[#F5E6EA]/30 -z-10" />
                    <div className="absolute inset-0 translate-y-0.5 translate-x-0.5 rounded-xl bg-[#450F1F] -z-10" />
                    <PlayingCardView
                      faceDown
                      size="md"
                      onClick={isMyTurn ? handleDrawCard : undefined}
                      ariaLabel={
                        activeTable.pendingDraw > 0
                          ? `Draw ${activeTable.pendingDraw} penalty cards`
                          : `Draw card from stock (${activeTable.stock.length} remaining)`
                      }
                    />
                  </div>
                  <span className="mt-1.5 text-[11px] font-semibold text-[#D4EDE1] tabular-nums">
                    {activeTable.pendingDraw > 0
                      ? `Draw +${activeTable.pendingDraw}`
                      : `Stock (${activeTable.stock.length})`}
                  </span>
                </div>

                {/* Discard Pile on Felt */}
                <div className="flex flex-col items-center">
                  <div className="rotate-2">
                    {topDiscard && <PlayingCardView code={topDiscard} size="md" />}
                  </div>
                  <span className="mt-1.5 text-[11px] font-semibold text-[#FDE68A] flex items-center gap-1">
                    <span>Suit:</span>
                    <span>{SUIT_SYMBOLS[activeTable.activeSuit]}</span>
                    <span>{SUIT_NAMES[activeTable.activeSuit]}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Current Table Narration */}
            <p className="mt-3 text-xs sm:text-sm font-medium text-center text-[#F2FBF7] px-2 leading-snug">
              {isOnline && room && !room.guestUid
                ? `Waiting for Nkanyezi to join Room ${room.roomCode}...`
                : activeTable.lastAction}
            </p>
          </div>

          {/* East Seat (in 4-player mode) */}
          <div className="col-span-3 flex flex-col items-end">
            {activeTable.seatCount === 4 && (
              <div className="flex flex-col items-end">
                <div
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold mb-1 shadow-md ${
                    activeTable.turnSeat === eastSeat && activeTable.winnerSeat === -1
                      ? 'bg-[#F59E0B] text-[#1D120B] ring-2 ring-[#FDE68A]'
                      : 'bg-[#091F14]/90 text-[#CDE6DA] border border-[#1C4D35]'
                  }`}
                >
                  <span className="block truncate max-w-[80px]">{getSeatName(eastSeat)}</span>
                  <span className="font-mono tabular-nums">{activeTable.hands[eastSeat].length} left</span>
                </div>
                <div className="hidden sm:flex -space-x-5">
                  {activeTable.hands[eastSeat].slice(0, 4).map((_, i) => (
                    <PlayingCardView key={i} faceDown size="xs" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= SOUTH SEAT: YOUR INTERACTIVE HAND ================= */}
        <div className="flex flex-col items-center pt-2 z-10">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-2.5">
            <span
              className={`text-xs sm:text-sm font-semibold ${
                isMyTurn ? 'text-[#FDE68A]' : 'text-[#A8D4BF]'
              }`}
            >
              {isMyTurn
                ? 'Your Turn · Tap a playable card to lay on the felt'
                : `${getSeatName(activeTable.turnSeat)}’s Turn`}
            </span>
            {activeTable.variant !== 'hearts' && isMyTurn && (
              <button
                type="button"
                onClick={handleDrawCard}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#1C5E40] hover:bg-[#257A53] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors shadow-md"
              >
                {activeTable.pendingDraw > 0
                  ? `Take +${activeTable.pendingDraw} Cards`
                  : 'Draw Card'}
              </button>
            )}
          </div>

          {/* Overlapping Handheld Card Fan */}
          <div className="w-full max-w-2xl flex items-end justify-center -space-x-3 sm:-space-x-5 overflow-x-auto py-3 px-4 min-h-[120px] sm:min-h-[140px] no-scrollbar">
            {myHand.map((code, idx) => {
              const playable =
                isMyTurn &&
                isCardPlayable(activeTable, mySeat, code);

              return (
                <div
                  key={`${code}-${idx}`}
                  className="transition-transform duration-150 hover:z-30 hover:-translate-y-4"
                >
                  <PlayingCardView
                    code={code}
                    size="md"
                    playable={playable}
                    onClick={playable ? () => handlePlayCard(code) : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= WILD 8 SUIT SELECTION MODAL ================= */}
      {pendingWildCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a suit for Crazy 8"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#092417] border-2 border-[#FDE68A] p-6 text-center shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-[#FDE68A] font-semibold">
              Wild 8 Played!
            </p>
            <h3 className="font-editorial text-2xl font-semibold text-white mt-1 mb-4">
              Declare New Suit
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SUITS.map((suit) => {
                const isRed = suit === 'H' || suit === 'D';
                return (
                  <button
                    key={suit}
                    type="button"
                    onClick={() => handleSelectWildSuit(suit)}
                    className="min-h-[54px] rounded-2xl bg-[#0F3522] hover:bg-[#1A5437] border border-[#276B48] flex items-center justify-center gap-2 text-base font-bold shadow-md transition-all active:scale-95"
                  >
                    <span className={isRed ? 'text-[#EF4444] text-xl' : 'text-white text-xl'}>
                      {SUIT_SYMBOLS[suit]}
                    </span>
                    <span className="text-white text-sm">{SUIT_NAMES[suit]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
