// Memory Match (Couple Keepsakes Cards) Pure Logic
export interface KeepsakeCardDef {
  key: string;
  name: string;
  symbol: string;
  color: string;
}

export const KEEPSAKE_DEFS: KeepsakeCardDef[] = [
  { key: 'star', name: 'Nkanyezi’s Star', symbol: '★', color: '#FDE68A' },
  { key: 'rose', name: 'Velvet Rose', symbol: '🌹', color: '#F43F5E' },
  { key: 'letter', name: 'Love Letter', symbol: '💌', color: '#FDA4AF' },
  { key: 'ring', name: 'Golden Ring', symbol: '💍', color: '#F59E0B' },
  { key: 'music', name: 'Favorite Melody', symbol: '🎵', color: '#818CF8' },
  { key: 'photo', name: 'Polaroid Memory', symbol: '📷', color: '#34D399' },
  { key: 'diamond', name: 'Heart Gem', symbol: '💎', color: '#38BDF8' },
  { key: 'swans', name: 'Twin Swans', symbol: '🦢', color: '#E2E8F0' },
];

export interface MemoryCard {
  id: number;
  symbolKey: string;
  name: string;
  symbol: string;
  color: string;
}

export interface MemoryMatchState {
  cards: MemoryCard[];
  flippedIndices: number[]; // Max 2
  matchedIndices: number[];
  scores: [number, number]; // [P0, P1]
  turnSeat: 0 | 1;
  winner: 0 | 1 | 'draw' | null;
  lastAction: string;
  isResolvingMismatch: boolean;
}

export function createInitialMemoryMatchState(seedDefs: KeepsakeCardDef[] = KEEPSAKE_DEFS): MemoryMatchState {
  const cards: MemoryCard[] = [];
  let id = 0;
  for (const def of seedDefs) {
    cards.push(
      { id: id++, symbolKey: def.key, name: def.name, symbol: def.symbol, color: def.color },
      { id: id++, symbolKey: def.key, name: def.name, symbol: def.symbol, color: def.color }
    );
  }

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return {
    cards,
    flippedIndices: [],
    matchedIndices: [],
    scores: [0, 0],
    turnSeat: 0,
    winner: null,
    lastAction: 'Game started! Flip two cards to find matching keepsakes.',
    isResolvingMismatch: false,
  };
}

export function flipMemoryCard(
  state: MemoryMatchState,
  index: number
): { nextState: MemoryMatchState; isMatch: boolean; shouldDelayTurn: boolean } {
  if (state.winner !== null || state.isResolvingMismatch) {
    return { nextState: state, isMatch: false, shouldDelayTurn: false };
  }
  if (state.matchedIndices.includes(index) || state.flippedIndices.includes(index)) {
    return { nextState: state, isMatch: false, shouldDelayTurn: false };
  }
  if (state.flippedIndices.length >= 2) {
    return { nextState: state, isMatch: false, shouldDelayTurn: false };
  }

  const newFlipped = [...state.flippedIndices, index];

  // 1st card flipped
  if (newFlipped.length === 1) {
    return {
      nextState: {
        ...state,
        flippedIndices: newFlipped,
        lastAction: `${state.turnSeat === 0 ? 'You' : 'Nkanyezi'} revealed ${state.cards[index].name}.`,
      },
      isMatch: false,
      shouldDelayTurn: false,
    };
  }

  // 2nd card flipped -> evaluate match
  const [firstIdx, secondIdx] = newFlipped;
  const isMatch = state.cards[firstIdx].symbolKey === state.cards[secondIdx].symbolKey;
  const actor = state.turnSeat === 0 ? 'You' : 'Nkanyezi';

  if (isMatch) {
    const nextMatched = [...state.matchedIndices, firstIdx, secondIdx];
    const nextScores: [number, number] = [state.scores[0], state.scores[1]];
    nextScores[state.turnSeat]++;

    const totalPairs = state.cards.length / 2;
    const allFound = nextScores[0] + nextScores[1] >= totalPairs;

    let winner: 0 | 1 | 'draw' | null = null;
    let action = '';

    if (allFound) {
      if (nextScores[0] > nextScores[1]) {
        winner = 0;
        action = `Game Over! You won with ${nextScores[0]} pairs to ${nextScores[1]}! 🏆`;
      } else if (nextScores[1] > nextScores[0]) {
        winner = 1;
        action = `Game Over! Nkanyezi won with ${nextScores[1]} pairs to ${nextScores[0]}! 💖`;
      } else {
        winner = 'draw';
        action = `Game Over! A perfect tie with ${nextScores[0]} pairs each! ✨`;
      }
    } else {
      action = `Match found! ${actor} matched ${state.cards[firstIdx].name} — Bonus Turn!`;
    }

    return {
      nextState: {
        ...state,
        flippedIndices: [],
        matchedIndices: nextMatched,
        scores: nextScores,
        winner,
        lastAction: action,
        isResolvingMismatch: false,
      },
      isMatch: true,
      shouldDelayTurn: false,
    };
  } else {
    // Mismatch -> keep both visible temporarily so players can see what was flipped
    return {
      nextState: {
        ...state,
        flippedIndices: newFlipped,
        lastAction: `${actor} flipped ${state.cards[secondIdx].name}. No match!`,
        isResolvingMismatch: true,
      },
      isMatch: false,
      shouldDelayTurn: true,
    };
  }
}

export function resolveMemoryMismatch(state: MemoryMatchState): MemoryMatchState {
  if (!state.isResolvingMismatch) return state;
  const nextTurn: 0 | 1 = state.turnSeat === 0 ? 1 : 0;
  return {
    ...state,
    flippedIndices: [],
    turnSeat: nextTurn,
    isResolvingMismatch: false,
  };
}

// Smart Bot for Memory Match
export function getSmartMemoryBotMove(
  state: MemoryMatchState,
  memoryMap: Map<number, string> // cardIndex -> symbolKey
): number {
  const availableIndices = state.cards
    .map((_, i) => i)
    .filter((i) => !state.matchedIndices.includes(i) && !state.flippedIndices.includes(i));

  if (availableIndices.length === 0) return 0;

  // If already 1 card flipped, can we match it from memory?
  if (state.flippedIndices.length === 1) {
    const flippedIdx = state.flippedIndices[0];
    const targetKey = state.cards[flippedIdx].symbolKey;
    for (const [idx, key] of memoryMap.entries()) {
      if (idx !== flippedIdx && key === targetKey && availableIndices.includes(idx)) {
        return idx;
      }
    }
  }

  // Can we make a known pair from memory?
  if (state.flippedIndices.length === 0) {
    const keyToIndices = new Map<string, number[]>();
    for (const [idx, key] of memoryMap.entries()) {
      if (availableIndices.includes(idx)) {
        const list = keyToIndices.get(key) ?? [];
        list.push(idx);
        keyToIndices.set(key, list);
        if (list.length === 2) {
          return list[0];
        }
      }
    }
  }

  // Otherwise, flip an unseen card
  const unseen = availableIndices.filter((i) => !memoryMap.has(i));
  if (unseen.length > 0) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  return availableIndices[Math.floor(Math.random() * availableIndices.length)];
}
