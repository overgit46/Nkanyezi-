// Mancala (Kalah) Pure Game Logic
export interface MancalaState {
  pits: number[]; // Length 14: 0..5 (P0), 6 (P0 Store), 7..12 (P1), 13 (P1 Store)
  turnSeat: 0 | 1;
  winner: 0 | 1 | 'draw' | null;
  lastAction: string;
  freeTurnGranted: boolean;
  capturedStones: number;
}

export const P0_PITS = [0, 1, 2, 3, 4, 5] as const;
export const P0_STORE = 6;
export const P1_PITS = [7, 8, 9, 10, 11, 12] as const;
export const P1_STORE = 13;

export function createInitialMancalaState(): MancalaState {
  const pits = Array(14).fill(4);
  pits[P0_STORE] = 0;
  pits[P1_STORE] = 0;
  return {
    pits,
    turnSeat: 0,
    winner: null,
    lastAction: 'Game started! Choose a pit to sow gemstones.',
    freeTurnGranted: false,
    capturedStones: 0,
  };
}

export function isPitPlayable(state: MancalaState, pitIndex: number): boolean {
  if (state.winner !== null) return false;
  if (state.turnSeat === 0) {
    return pitIndex >= 0 && pitIndex <= 5 && state.pits[pitIndex] > 0;
  } else {
    return pitIndex >= 7 && pitIndex <= 12 && state.pits[pitIndex] > 0;
  }
}

export function playMancalaMove(state: MancalaState, chosenPit: number): MancalaState {
  if (!isPitPlayable(state, chosenPit)) return state;

  const pits = [...state.pits];
  let stones = pits[chosenPit];
  pits[chosenPit] = 0;

  let currentPit = chosenPit;
  const isP0 = state.turnSeat === 0;
  const myStore = isP0 ? P0_STORE : P1_STORE;
  const opponentStore = isP0 ? P1_STORE : P0_STORE;

  while (stones > 0) {
    currentPit = (currentPit + 1) % 14;
    // Skip opponent's store
    if (currentPit === opponentStore) {
      continue;
    }
    pits[currentPit]++;
    stones--;
  }

  let freeTurn = false;
  let captured = 0;

  // Rule 1: Last stone in store -> Free Turn!
  if (currentPit === myStore) {
    freeTurn = true;
  }
  // Rule 2: Last stone in empty pit on player's own side -> Capture!
  else {
    const isOwnSide = isP0
      ? currentPit >= 0 && currentPit <= 5
      : currentPit >= 7 && currentPit <= 12;

    if (isOwnSide && pits[currentPit] === 1) {
      const oppositePit = 12 - currentPit;
      if (pits[oppositePit] > 0) {
        captured = pits[oppositePit] + 1;
        pits[myStore] += captured;
        pits[currentPit] = 0;
        pits[oppositePit] = 0;
      }
    }
  }

  // Check Game End condition: all pits on either side are 0
  const p0Empty = P0_PITS.every((p) => pits[p] === 0);
  const p1Empty = P1_PITS.every((p) => pits[p] === 0);

  let winner: 0 | 1 | 'draw' | null = null;
  let actionText = '';

  if (p0Empty || p1Empty) {
    // Sweep remaining stones into respective stores
    for (const p of P0_PITS) {
      pits[P0_STORE] += pits[p];
      pits[p] = 0;
    }
    for (const p of P1_PITS) {
      pits[P1_STORE] += pits[p];
      pits[p] = 0;
    }

    if (pits[P0_STORE] > pits[P1_STORE]) {
      winner = 0;
      actionText = `Game Over! Player 1 wins ${pits[P0_STORE]} to ${pits[P1_STORE]}!`;
    } else if (pits[P1_STORE] > pits[P0_STORE]) {
      winner = 1;
      actionText = `Game Over! Nkanyezi wins ${pits[P1_STORE]} to ${pits[P0_STORE]}!`;
    } else {
      winner = 'draw';
      actionText = `Game Over! It’s a peaceful draw at ${pits[P0_STORE]} gems each!`;
    }
  } else {
    const actorName = isP0 ? 'You' : 'Nkanyezi';
    if (captured > 0) {
      actionText = `${actorName} captured ${captured} gemstones!`;
    } else if (freeTurn) {
      actionText = `${actorName} landed in the store — Free Turn!`;
    } else {
      actionText = `${actorName} sowed gemstones.`;
    }
  }

  const nextTurn: 0 | 1 = freeTurn && winner === null ? state.turnSeat : isP0 ? 1 : 0;

  return {
    pits,
    turnSeat: winner !== null ? state.turnSeat : nextTurn,
    winner,
    lastAction: actionText,
    freeTurnGranted: freeTurn,
    capturedStones: captured,
  };
}

// Smart AI for Mancala
export function getSmartMancalaBotMove(state: MancalaState, botSeat: 0 | 1 = 1): number {
  const legalPits = (botSeat === 1 ? P1_PITS : P0_PITS).filter((p) => state.pits[p] > 0);
  if (legalPits.length === 0) return 7;

  // 1. Look for moves that land exactly in store (Free Turn)
  const myStore = botSeat === 1 ? P1_STORE : P0_STORE;
  for (const pit of legalPits) {
    const dist = (myStore - pit + 14) % 14;
    if (state.pits[pit] === dist) {
      return pit;
    }
  }

  // 2. Look for moves that perform a capture
  let bestCapturePit: number | null = null;
  let maxCaptured = 0;
  for (const pit of legalPits) {
    const simulated = playMancalaMove(state, pit);
    if (simulated.capturedStones > maxCaptured) {
      maxCaptured = simulated.capturedStones;
      bestCapturePit = pit;
    }
  }
  if (bestCapturePit !== null && maxCaptured > 0) {
    return bestCapturePit;
  }

  // 3. Fallback: choose the pit with the most stones or rightmost
  legalPits.sort((a, b) => state.pits[b] - state.pits[a]);
  return legalPits[0];
}
