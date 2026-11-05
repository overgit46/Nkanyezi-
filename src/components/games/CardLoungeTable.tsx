import { useEffect, useState } from 'react';
import {
  CardCode,
  CardTableState,
  CardVariant,
  chooseBotCardAction,
  createCardGame,
  drawFromStockMove,
  isCardPlayable,
  parseCard,
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

  // Sync HUD score readout
  useEffect(() => {
    if (isOnline && room) {
      onScoreChange(
        isHost ? room.hostScore : room.guestScore,
        isHost ? room.guestScore : room.hostScore
      );
    } else {
      onScoreChange(localWins.you, localWins.table);
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

  // Automated smart bot turns (runs locally when offline, or driven by Host when online in 4P mode)
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
        if (next.winnerSeat !== -1) {
          if (next.winnerSeat === 0) {
            gameAudio.playWinFanfare();
            setLocalWins((prev) => ({ ...prev, you: prev.you + 1 }));
            onMatchEnd('You Cleared Your Hand!', next.lastAction);
          } else {
            setLocalWins((prev) => ({ ...prev, table: prev.table + 1 }));
            onMatchEnd(`${getSeatName(next.winnerSeat)} Won the Hand`, next.lastAction);
          }
        }
      }
    }, 640);

    return () => window.clearTimeout(timer);
  }, [paused, isOnline, isHost, room?.roomCode, room?.guestUid, activeTable]);

  const commitTableTransition = async (next: CardTableState) => {
    if (isOnline && room) {
      const hostWon = next.winnerSeat === 0;
      const guestWon = next.winnerSeat === 2;
      if (hostWon || guestWon) {
        gameAudio.playWinFanfare();
      }
      await updateRoomGameplay(room.roomCode, {
        ...cardStateToRoomFields(next),
        hostScore: hostWon ? room.hostScore + 1 : room.hostScore,
        guestScore: guestWon ? room.guestScore + 1 : room.guestScore,
        roomStatus: next.winnerSeat !== -1 ? 'round_over' : 'playing',
      });
      return;
    }

    setLocalTable(next);
    if (next.winnerSeat !== -1) {
      if (next.winnerSeat === 0) {
        gameAudio.playWinFanfare();
        setLocalWins((prev) => ({ ...prev, you: prev.you + 1 }));
        onMatchEnd('You Won the Card Hand!', next.lastAction);
      } else {
        setLocalWins((prev) => ({ ...prev, table: prev.table + 1 }));
        onMatchEnd(`${getSeatName(next.winnerSeat)} Won the Hand`, next.lastAction);
      }
    }
  };

  const handleSelectCard = async (card: CardCode) => {
    if (paused || !isCardPlayable(activeTable, mySeat, card)) return;
    const parsed = parseCard(card);

    if (activeTable.variant !== 'hearts' && parsed.rank === '8') {
      setPendingWildCard(card);
      return;
    }

    gameAudio.playCardSnap();
    const next = playCardMove(activeTable, mySeat, card, undefined, getSeatName(mySeat));
    await commitTableTransition(next);
  };

  const handleConfirmWildSuit = async (suit: Suit) => {
    if (!pendingWildCard) return;
    const card = pendingWildCard;
    setPendingWildCard(null);
    gameAudio.playWildSuit();
    const next = playCardMove(activeTable, mySeat, card, suit, getSeatName(mySeat));
    await commitTableTransition(next);
  };

  const handleDrawCard = async () => {
    if (
      paused ||
      activeTable.winnerSeat !== -1 ||
      activeTable.turnSeat !== mySeat ||
      activeTable.variant === 'hearts'
    ) {
      return;
    }
    gameAudio.playCardDraw();
    const next = drawFromStockMove(activeTable, mySeat, getSeatName(mySeat));
    await commitTableTransition(next);
  };

  const handleVariantOrSeatsChange = async (
    variant: CardVariant,
    seatCount: 2 | 4
  ) => {
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

  // Relative seats around the table from the viewer's perspective (South = mySeat)
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
    <div className="w-full h-full flex flex-col justify-between gap-2 px-2 sm:px-4 py-1.5 max-w-5xl mx-auto">
      {/* Top Variant & Seat Count Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#162921] border border-[#29493B] rounded-2xl px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Card game mode">
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
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTable.variant === mode.id
                  ? 'bg-[#D81B60] text-white'
                  : 'text-[#BBD8CA] hover:text-white hover:bg-[#213B30]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Player count">
          {([4, 2] as const).map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => handleVariantOrSeatsChange(activeTable.variant, count)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTable.seatCount === count
                  ? 'bg-[#F5E6EA] text-[#1D1418]'
                  : 'text-[#BBD8CA] hover:text-white hover:bg-[#213B30]'
              }`}
            >
              {count} Players
            </button>
          ))}
        </div>
      </div>

      {/* Main Felt Card Table Surface (60% rich emerald felt, 30% dark mahogany rail, 10% gold/rose accents) */}
      <div className="relative flex-1 min-h-[320px] rounded-3xl bg-[#143829] border-4 border-[#3E242D] shadow-2xl px-3 py-3 sm:px-6 sm:py-4 flex flex-col justify-between overflow-hidden">
        {/* North Seat (Partner / Opponent) */}
        <div className="flex flex-col items-center">
          <div
            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              activeTable.turnSeat === northSeat && activeTable.winnerSeat === -1
                ? 'bg-[#F59E0B] text-[#1B1316]'
                : 'bg-[#0E281D] text-[#D7ECE2] border border-[#285340]'
            }`}
          >
            <span>{getSeatName(northSeat)}</span>
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
          <div className="flex items-center justify-center -space-x-4 mt-1.5">
            {activeTable.hands[northSeat].slice(0, 7).map((_, i) => (
              <PlayingCardView key={i} faceDown size="xs" />
            ))}
          </div>
        </div>

        {/* Middle Row: West Seat + Center Stock/Discard/Pot + East Seat */}
        <div className="grid grid-cols-12 items-center gap-2 my-2">
          {/* West Seat (4-player mode only) */}
          <div className="col-span-3 flex flex-col items-start">
            {activeTable.seatCount === 4 && (
              <div className="flex flex-col items-center">
                <div
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold mb-1.5 ${
                    activeTable.turnSeat === westSeat && activeTable.winnerSeat === -1
                      ? 'bg-[#F59E0B] text-[#1B1316]'
                      : 'bg-[#0E281D] text-[#D7ECE2] border border-[#285340]'
                  }`}
                >
                  <span className="block truncate max-w-[84px]">{getSeatName(westSeat)}</span>
                  <span className="font-mono tabular-nums">
                    {activeTable.hands[westSeat].length} left
                  </span>
                </div>
                <div className="hidden sm:flex -space-x-5">
                  {activeTable.hands[westSeat].slice(0, 5).map((_, i) => (
                    <PlayingCardView key={i} faceDown size="xs" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Play Area */}
          <div className="col-span-6 flex flex-col items-center justify-center">
            {activeTable.variant === 'hearts' ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#CBE5D8]">
                  Hearts (♥) Trump All Suits
                </p>
                <div className="min-h-[96px] flex items-center justify-center gap-2">
                  {activeTable.trickPot.length === 0 ? (
                    <div className="px-4 py-3 rounded-2xl border border-dashed border-[#3B6E57] text-xs text-[#B6D8C7]">
                      Lead a card to start the trick
                    </div>
                  ) : (
                    activeTable.trickPot.map((entry) => {
                      const [seatStr, cCode] = entry.split(':');
                      return (
                        <div key={entry} className="flex flex-col items-center">
                          <PlayingCardView code={cCode as CardCode} size="sm" />
                          <span className="text-[10px] text-[#D7ECE2] mt-1">
                            {getSeatName(Number(seatStr)).split(' ')[0]}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                {/* Stock Pile */}
                <div className="flex flex-col items-center">
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
                  <span className="mt-1 text-[11px] font-semibold text-[#D7ECE2] tabular-nums">
                    {activeTable.pendingDraw > 0
                      ? `Draw +${activeTable.pendingDraw}`
                      : `Stock (${activeTable.stock.length})`}
                  </span>
                </div>

                {/* Discard Pile */}
                <div className="flex flex-col items-center">
                  {topDiscard && <PlayingCardView code={topDiscard} size="md" />}
                  <span className="mt-1 text-[11px] font-semibold text-[#FDE68A] flex items-center gap-1">
                    <span>Suit:</span>
                    <span>{SUIT_SYMBOLS[activeTable.activeSuit]}</span>
                    <span>{SUIT_NAMES[activeTable.activeSuit]}</span>
                  </span>
                </div>
              </div>
            )}

            <p className="mt-2.5 text-xs sm:text-sm font-medium text-center text-[#F2FBF7] px-2">
              {isOnline && room && !room.guestUid
                ? `Waiting for Nkanyezi to join Room ${room.roomCode}...`
                : activeTable.lastAction}
            </p>
          </div>

          {/* East Seat (4-player mode only) */}
          <div className="col-span-3 flex flex-col items-end">
            {activeTable.seatCount === 4 && (
              <div className="flex flex-col items-center">
                <div
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold mb-1.5 ${
                    activeTable.turnSeat === eastSeat && activeTable.winnerSeat === -1
                      ? 'bg-[#F59E0B] text-[#1B1316]'
                      : 'bg-[#0E281D] text-[#D7ECE2] border border-[#285340]'
                  }`}
                >
                  <span className="block truncate max-w-[84px]">{getSeatName(eastSeat)}</span>
                  <span className="font-mono tabular-nums">
                    {activeTable.hands[eastSeat].length} left
                  </span>
                </div>
                <div className="hidden sm:flex -space-x-5">
                  {activeTable.hands[eastSeat].slice(0, 5).map((_, i) => (
                    <PlayingCardView key={i} faceDown size="xs" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* South Seat: Viewer's Interactive Hand */}
        <div className="flex flex-col items-center pt-1">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
            <span
              className={`text-xs sm:text-sm font-semibold ${
                isMyTurn ? 'text-[#FDE68A]' : 'text-[#CBE5D8]'
              }`}
            >
              {isMyTurn
                ? 'Your Turn · Tap a lifted gold-rimmed card or Draw'
                : `${getSeatName(activeTable.turnSeat)}’s Turn`}
            </span>
            {activeTable.variant !== 'hearts' && isMyTurn && (
              <button
                type="button"
                onClick={handleDrawCard}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#23533E] hover:bg-[#2C684E] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                {activeTable.pendingDraw > 0
                  ? `Take +${activeTable.pendingDraw} Cards`
                  : 'Draw Card'}
              </button>
            )}
            {activeTable.winnerSeat !== -1 && (
              <button
                type="button"
                onClick={() =>
                  handleVariantOrSeatsChange(activeTable.variant, activeTable.seatCount)
                }
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                Deal New Hand
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Your card hand"
            className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pb-1"
          >
            {myHand.map((card, idx) => {
              const playable = isCardPlayable(activeTable, mySeat, card) && isMyTurn;
              return (
                <PlayingCardView
                  key={`${card}-${idx}`}
                  code={card}
                  size="md"
                  playable={playable}
                  onClick={() => handleSelectCard(card)}
                />
              );
            })}
          </div>
        </div>

        {/* Wild 8 Suit Picker Overlay */}
        {pendingWildCard && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a wild suit for your 8"
            className="absolute inset-0 z-20 bg-[#101C16]/92 flex items-center justify-center p-4"
          >
            <div className="bg-[#23161D] border-2 border-[#E6B8C7] rounded-3xl p-5 max-w-sm w-full text-center shadow-2xl">
              <p className="text-xs uppercase tracking-widest text-[#E6B8C7] mb-1">
                Crazy Eight Wild Card
              </p>
              <h3 className="font-editorial text-2xl font-semibold text-white mb-4">
                Choose the Next Suit
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {SUITS.map((suit) => {
                  const isRed = suit === 'H' || suit === 'D';
                  return (
                    <button
                      key={suit}
                      type="button"
                      onClick={() => handleConfirmWildSuit(suit)}
                      className="min-h-[52px] rounded-2xl bg-[#FFFDFB] hover:bg-[#F9EDF1] border border-[#E2D4D9] flex items-center justify-center gap-2 text-base font-bold transition-transform active:scale-95"
                    >
                      <span className={isRed ? 'text-[#C81E51] text-2xl' : 'text-[#1E1920] text-2xl'}>
                        {SUIT_SYMBOLS[suit]}
                      </span>
                      <span className="text-[#1F1518] text-sm">{SUIT_NAMES[suit]}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPendingWildCard(null)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-[#D6B8C4] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
