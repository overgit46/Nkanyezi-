export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export type CardCode = `${Rank}${Suit}`;
export type CardVariant = 'crazy8' | 'switch' | 'hearts';

export interface ParsedCard {
  code: CardCode;
  rank: Rank;
  suit: Suit;
  isRed: boolean;
}

export interface CardTableState {
  variant: CardVariant;
  seatCount: 2 | 4;
  stock: CardCode[];
  discard: CardCode[];
  hands: [CardCode[], CardCode[], CardCode[], CardCode[]];
  activeSuit: Suit;
  turnSeat: number;
  direction: 1 | -1;
  pendingDraw: number;
  trickPot: string[]; // Format: `${seat}:${cardCode}`
  trickScores: [number, number, number, number];
  lastAction: string;
  winnerSeat: number; // -1 while playing, 0..3 when won
}

export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: readonly Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

const RANK_POWER: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function parseCard(code: string): ParsedCard {
  const suit = code.slice(-1) as Suit;
  const rank = code.slice(0, -1) as Rank;
  return {
    code: code as CardCode,
    rank,
    suit,
    isRed: suit === 'H' || suit === 'D',
  };
}

export function createShuffledDeck(rng: () => number = Math.random): CardCode[] {
  const deck: CardCode[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function getActiveSeats(seatCount: 2 | 4): number[] {
  return seatCount === 2 ? [0, 2] : [0, 1, 2, 3];
}

export function advanceSeat(
  currentSeat: number,
  direction: 1 | -1,
  seatCount: 2 | 4,
  steps = 1
): number {
  const seats = getActiveSeats(seatCount);
  const idx = seats.indexOf(currentSeat);
  const baseIdx = idx === -1 ? 0 : idx;
  const len = seats.length;
  const nextIdx = (((baseIdx + direction * steps) % len) + len) % len;
  return seats[nextIdx];
}

export function createCardGame(
  variant: CardVariant = 'crazy8',
  seatCount: 2 | 4 = 4,
  rng: () => number = Math.random
): CardTableState {
  const deck = createShuffledDeck(rng);
  const hands: [CardCode[], CardCode[], CardCode[], CardCode[]] = [[], [], [], []];
  const seats = getActiveSeats(seatCount);
  const cardsPerSeat = variant === 'hearts' ? 7 : seatCount === 4 ? 5 : 7;

  for (let c = 0; c < cardsPerSeat; c++) {
    for (const s of seats) {
      const drawn = deck.pop();
      if (drawn) hands[s].push(drawn);
    }
  }

  if (variant === 'hearts') {
    return {
      variant,
      seatCount,
      stock: [],
      discard: [],
      hands,
      activeSuit: 'H',
      turnSeat: 0,
      direction: 1,
      pendingDraw: 0,
      trickPot: [],
      trickScores: [0, 0, 0, 0],
      lastAction: 'Hearts Trump: Lead any card (Hearts trump all suits)',
      winnerSeat: -1,
    };
  }

  // Pull non-8 starter card for Crazy Eights / Action Switch
  let starterIdx = deck.findIndex((c) => !c.startsWith('8'));
  if (starterIdx === -1) starterIdx = 0;
  const [starterCard] = deck.splice(starterIdx, 1);
  const parsedStarter = parseCard(starterCard);

  return {
    variant,
    seatCount,
    stock: deck,
    discard: [starterCard],
    hands,
    activeSuit: parsedStarter.suit,
    turnSeat: 0,
    direction: 1,
    pendingDraw: 0,
    trickPot: [],
    trickScores: [0, 0, 0, 0],
    lastAction:
      variant === 'crazy8'
        ? `Crazy Eights (${seatCount}P): Match ${SUIT_NAMES[parsedStarter.suit]} or ${parsedStarter.rank}`
        : `Action Switch (${seatCount}P): 2=+2, J=Skip, K=Reverse, 8=Wild`,
    winnerSeat: -1,
  };
}

export function isCardPlayable(
  state: CardTableState,
  seat: number,
  card: CardCode
): boolean {
  if (state.winnerSeat !== -1 || state.turnSeat !== seat) return false;
  const hand = state.hands[seat];
  if (!hand.includes(card)) return false;

  const parsed = parseCard(card);

  if (state.variant === 'hearts') {
    if (state.trickPot.length === 0) return true;
    const ledCode = state.trickPot[0].split(':')[1];
    const ledSuit = parseCard(ledCode).suit;
    const hasLedSuit = hand.some((c) => parseCard(c).suit === ledSuit);
    return hasLedSuit ? parsed.suit === ledSuit : true;
  }

  // In Action Switch, if pendingDraw > 0, player must either stack a '2' or draw the penalty
  if (state.variant === 'switch' && state.pendingDraw > 0) {
    return parsed.rank === '2';
  }

  // 8 is always wild in Crazy Eights and Action Switch
  if (parsed.rank === '8') return true;

  const topDiscard = state.discard[state.discard.length - 1];
  if (!topDiscard) return true;
  const topParsed = parseCard(topDiscard);

  return parsed.suit === state.activeSuit || parsed.rank === topParsed.rank;
}

function drawNCards(
  stockInput: CardCode[],
  discardInput: CardCode[],
  count: number
): { drawn: CardCode[]; stock: CardCode[]; discard: CardCode[] } {
  let stock = [...stockInput];
  let discard = [...discardInput];
  const drawn: CardCode[] = [];

  for (let i = 0; i < count; i++) {
    if (stock.length === 0 && discard.length > 1) {
      const top = discard[discard.length - 1];
      const recycled = discard.slice(0, -1);
      for (let k = recycled.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [recycled[k], recycled[j]] = [recycled[j], recycled[k]];
      }
      stock = recycled;
      discard = [top];
    }
    const next = stock.pop();
    if (next) drawn.push(next);
  }

  return { drawn, stock, discard };
}

function evaluateTrickWinner(pot: string[]): number {
  const entries = pot.map((item) => {
    const [seatStr, code] = item.split(':');
    return { seat: Number(seatStr), card: parseCard(code) };
  });
  const ledSuit = entries[0].card.suit;
  let best = entries[0];

  for (let i = 1; i < entries.length; i++) {
    const challenger = entries[i];
    const bestIsTrump = best.card.suit === 'H';
    const chalIsTrump = challenger.card.suit === 'H';

    if (chalIsTrump && !bestIsTrump) {
      best = challenger;
    } else if (
      challenger.card.suit === best.card.suit &&
      RANK_POWER[challenger.card.rank] > RANK_POWER[best.card.rank]
    ) {
      best = challenger;
    } else if (!bestIsTrump && challenger.card.suit === ledSuit && best.card.suit !== ledSuit) {
      best = challenger;
    }
  }
  return best.seat;
}

export function playCardMove(
  state: CardTableState,
  seat: number,
  card: CardCode,
  chosenWildSuit?: Suit,
  seatLabel = `Seat ${seat + 1}`
): CardTableState {
  if (!isCardPlayable(state, seat, card)) return state;

  const hands: [CardCode[], CardCode[], CardCode[], CardCode[]] = [
    [...state.hands[0]],
    [...state.hands[1]],
    [...state.hands[2]],
    [...state.hands[3]],
  ];
  const cardIdx = hands[seat].indexOf(card);
  hands[seat].splice(cardIdx, 1);

  const parsed = parseCard(card);

  // Variant 3: Hearts Trump Trick Mode
  if (state.variant === 'hearts') {
    const nextPot = [...state.trickPot, `${seat}:${card}`];
    const expectedCards = getActiveSeats(state.seatCount).length;

    if (nextPot.length < expectedCards) {
      return {
        ...state,
        hands,
        trickPot: nextPot,
        turnSeat: advanceSeat(seat, 1, state.seatCount, 1),
        lastAction: `${seatLabel} played ${parsed.rank}${SUIT_SYMBOLS[parsed.suit]}`,
      };
    }

    // Resolve trick
    const trickWinner = evaluateTrickWinner(nextPot);
    const nextScores: [number, number, number, number] = [...state.trickScores];
    nextScores[trickWinner] += 1;

    const allEmpty = getActiveSeats(state.seatCount).every((s) => hands[s].length === 0);
    let overallWinner = -1;
    if (allEmpty) {
      const activeSeats = getActiveSeats(state.seatCount);
      overallWinner = activeSeats.reduce((bestSeat, s) =>
        nextScores[s] > nextScores[bestSeat] ? s : bestSeat
      , activeSeats[0]);
    }

    return {
      ...state,
      hands,
      trickPot: [],
      trickScores: nextScores,
      turnSeat: trickWinner,
      winnerSeat: overallWinner,
      lastAction:
        overallWinner !== -1
          ? `Hand complete — Seat ${overallWinner + 1} wins with ${nextScores[overallWinner]} tricks!`
          : `Seat ${trickWinner + 1} won the trick with ${SUIT_SYMBOLS[parsed.suit]}!`,
    };
  }

  // Crazy Eights & Action Switch
  const nextDiscard = [...state.discard, card];
  let nextSuit: Suit = parsed.rank === '8' ? chosenWildSuit ?? parsed.suit : parsed.suit;
  let nextDirection = state.direction;
  let nextPendingDraw = state.pendingDraw;
  let stepCount = 1;
  let note = `${seatLabel} played ${parsed.rank}${SUIT_SYMBOLS[parsed.suit]}`;

  if (parsed.rank === '8') {
    note = `${seatLabel} played Wild 8 → chose ${SUIT_NAMES[nextSuit]} ${SUIT_SYMBOLS[nextSuit]}`;
  } else if (state.variant === 'switch') {
    if (parsed.rank === '2') {
      nextPendingDraw += 2;
      note = `${seatLabel} played 2${SUIT_SYMBOLS[parsed.suit]} → +${nextPendingDraw} draw penalty!`;
    } else if (parsed.rank === 'J') {
      stepCount = 2;
      note = `${seatLabel} played Jack → skipped next player!`;
    } else if (parsed.rank === 'K') {
      if (state.seatCount === 2) {
        stepCount = 2; // In 2P, Reverse acts like Skip
        note = `${seatLabel} played King → goes again!`;
      } else {
        nextDirection = (state.direction * -1) as 1 | -1;
        note = `${seatLabel} played King → reversed direction!`;
      }
    }
  }

  const hasWon = hands[seat].length === 0;
  const nextTurn = hasWon
    ? seat
    : advanceSeat(seat, nextDirection, state.seatCount, stepCount);

  return {
    ...state,
    hands,
    discard: nextDiscard,
    activeSuit: nextSuit,
    direction: nextDirection,
    pendingDraw: hasWon ? 0 : nextPendingDraw,
    turnSeat: nextTurn,
    winnerSeat: hasWon ? seat : -1,
    lastAction: hasWon ? `${seatLabel} shed their final card and won!` : note,
  };
}

export function drawFromStockMove(
  state: CardTableState,
  seat: number,
  seatLabel = `Seat ${seat + 1}`
): CardTableState {
  if (state.winnerSeat !== -1 || state.turnSeat !== seat || state.variant === 'hearts') {
    return state;
  }

  const count = state.pendingDraw > 0 ? state.pendingDraw : 1;
  const { drawn, stock, discard } = drawNCards(state.stock, state.discard, count);

  const hands: [CardCode[], CardCode[], CardCode[], CardCode[]] = [
    [...state.hands[0]],
    [...state.hands[1]],
    [...state.hands[2]],
    [...state.hands[3]],
  ];
  hands[seat].push(...drawn);

  const nextTurn = advanceSeat(seat, state.direction, state.seatCount, 1);
  const actionMsg =
    state.pendingDraw > 0
      ? `${seatLabel} drew ${drawn.length} penalty cards`
      : drawn.length > 0
        ? `${seatLabel} drew a card`
        : `${seatLabel} passed (stock empty)`;

  return {
    ...state,
    stock,
    discard,
    hands,
    pendingDraw: 0,
    turnSeat: nextTurn,
    lastAction: actionMsg,
  };
}

export function chooseBotCardAction(
  state: CardTableState,
  seat: number,
  botName: string
): CardTableState {
  const hand = state.hands[seat];
  const playable = hand.filter((c) => isCardPlayable(state, seat, c));

  if (playable.length === 0) {
    return drawFromStockMove(state, seat, botName);
  }

  // Prefer non-8 cards first so bots save Wild 8s strategically
  const nonEights = playable.filter((c) => !c.startsWith('8'));
  const chosenCard = nonEights.length > 0 ? nonEights[0] : playable[0];

  if (chosenCard.startsWith('8')) {
    // Pick suit bot holds the most of
    const counts: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
    for (const c of hand) {
      if (c !== chosenCard) {
        counts[parseCard(c).suit] += 1;
      }
    }
    const bestSuit = SUITS.reduce((best, s) => (counts[s] > counts[best] ? s : best), 'H' as Suit);
    return playCardMove(state, seat, chosenCard, bestSuit, botName);
  }

  return playCardMove(state, seat, chosenCard, undefined, botName);
}
