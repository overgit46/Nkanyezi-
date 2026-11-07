/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BoardSpecial {
  from: number;
  to: number;
  kind: 'ladder' | 'snake';
  label: string;
  romanticNote: string;
}

// Couple's Edition Snakes & Ladders: Thoughtful milestones & playful couple hazards
export const LADDERS: Record<number, BoardSpecial> = {
  4: {
    from: 4,
    to: 25,
    kind: 'ladder',
    label: 'First Date Spark',
    romanticNote: 'That nervous first laugh that started it all (+21 tiles!)',
  },
  9: {
    from: 9,
    to: 31,
    kind: 'ladder',
    label: 'Uncontrollable Laughs',
    romanticNote: 'Inside jokes only the two of us understand (+22 tiles!)',
  },
  20: {
    from: 20,
    to: 38,
    kind: 'ladder',
    label: 'Surprise Sweet Treat',
    romanticNote: 'Bringing you your favorite iced drink unprompted (+18 tiles!)',
  },
  28: {
    from: 28,
    to: 84,
    kind: 'ladder',
    label: 'Deep Midnight Talk',
    romanticNote: 'Talking about everything with complete honesty (+56 super climb!)',
  },
  40: {
    from: 40,
    to: 59,
    kind: 'ladder',
    label: 'Warm Hug',
    romanticNote: 'Wrapping arms around you when you had a long day (+19 tiles!)',
  },
  51: {
    from: 51,
    to: 67,
    kind: 'ladder',
    label: 'Forehead Kiss',
    romanticNote: 'Sweet, quiet reassurance right when you need it (+16 tiles!)',
  },
  63: {
    from: 63,
    to: 81,
    kind: 'ladder',
    label: 'Sunset Golden Hour',
    romanticNote: 'Looking at you smiling in the passenger seat (+18 tiles!)',
  },
  71: {
    from: 71,
    to: 91,
    kind: 'ladder',
    label: 'Unconditional Support',
    romanticNote: 'Believing in your brilliant mind before anyone else (+20 tiles!)',
  },
};

export const SNAKES: Record<number, BoardSpecial> = {
  17: {
    from: 17,
    to: 7,
    kind: 'snake',
    label: 'Lost in Her Eyes',
    romanticNote: 'Got totally distracted by your smile and missed the turn (-10 tiles)',
  },
  54: {
    from: 54,
    to: 34,
    kind: 'snake',
    label: 'Hoodie Theft',
    romanticNote: 'You stole my favorite warm oversized hoodie again (-20 tiles)',
  },
  62: {
    from: 62,
    to: 19,
    kind: 'snake',
    label: 'Dinner Indecision',
    romanticNote: '“What do you want to eat?” “I don’t know, whatever you want” (-43 tiles)',
  },
  64: {
    from: 64,
    to: 60,
    kind: 'snake',
    label: 'Playful Tickle Fight',
    romanticNote: 'A goofy detour on the couch (-4 tiles)',
  },
  87: {
    from: 87,
    to: 24,
    kind: 'snake',
    label: 'GPS Stubbornness',
    romanticNote: '“I know a shortcut”... famous last words (-63 mega slide!)',
  },
  93: {
    from: 93,
    to: 73,
    kind: 'snake',
    label: 'Teasing Backfire',
    romanticNote: 'You roasted me so cleanly I needed a moment to recover (-20 tiles)',
  },
  95: {
    from: 95,
    to: 75,
    kind: 'snake',
    label: 'Camera Roll Goof',
    romanticNote: 'Caught me off-guard with a zero-filter goofy snapshot (-20 tiles)',
  },
  99: {
    from: 99,
    to: 78,
    kind: 'snake',
    label: 'Nail-Biter Finish',
    romanticNote: 'One step from the crown, but the drama continues! (-21 tiles)',
  },
};

export interface SnakesState {
  p1Pos: number; // 1..100 (Host / You)
  p2Pos: number; // 1..100 (Partner / Nkanyezi)
  turnSeat: 0 | 1; // 0 = Player 1, 1 = Player 2
  lastRoll: number; // 0..6
  consecutiveSixes: number; // 0..3
  lastEvent: string;
  winner: 0 | 1 | null;
  history: string[];
}

export function createInitialSnakesState(): SnakesState {
  return {
    p1Pos: 1,
    p2Pos: 1,
    turnSeat: 0,
    lastRoll: 0,
    consecutiveSixes: 0,
    lastEvent: 'Game started! Roll the dice to begin your romantic journey.',
    winner: null,
    history: [],
  };
}

export function rollDiceValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export interface MoveResolution {
  nextState: SnakesState;
  landedSpecial: BoardSpecial | null;
  rolledSix: boolean;
  bounced: boolean;
  won: boolean;
}

export function applySnakesMove(
  state: SnakesState,
  roll: number,
  player1Name = 'You',
  player2Name = 'Nkanyezi'
): MoveResolution {
  if (state.winner !== null) {
    return {
      nextState: state,
      landedSpecial: null,
      rolledSix: false,
      bounced: false,
      won: false,
    };
  }

  const currentSeat = state.turnSeat;
  const currentPos = currentSeat === 0 ? state.p1Pos : state.p2Pos;
  const activeName = currentSeat === 0 ? player1Name : player2Name;

  // Track consecutive 6s
  let consecutiveSixes = roll === 6 ? state.consecutiveSixes + 1 : 0;
  let rolledSix = roll === 6;

  // 3 sixes penalty: pass turn immediately
  if (consecutiveSixes >= 3) {
    const nextSeat = currentSeat === 0 ? 1 : 0;
    const eventMsg = `${activeName} rolled 3 sixes in a row! Turn passes to ${
      nextSeat === 0 ? player1Name : player2Name
    }.`;
    return {
      nextState: {
        ...state,
        lastRoll: roll,
        consecutiveSixes: 0,
        turnSeat: nextSeat as 0 | 1,
        lastEvent: eventMsg,
        history: [eventMsg, ...state.history].slice(0, 8),
      },
      landedSpecial: null,
      rolledSix: false,
      bounced: false,
      won: false,
    };
  }

  // Calculate target position with bounce-back rule for exact 100 finish
  let target = currentPos + roll;
  let bounced = false;
  if (target > 100) {
    const overshoot = target - 100;
    target = 100 - overshoot;
    bounced = true;
  }

  // Check special tiles (ladder or snake)
  let landedSpecial: BoardSpecial | null = null;
  let finalPos = target;
  let specialDescription = '';

  if (LADDERS[target]) {
    landedSpecial = LADDERS[target];
    finalPos = landedSpecial.to;
    specialDescription = ` 🪜 Climbed ladder to tile ${finalPos}: "${landedSpecial.label}"!`;
  } else if (SNAKES[target]) {
    landedSpecial = SNAKES[target];
    finalPos = landedSpecial.to;
    specialDescription = ` 🐍 Slid down snake to tile ${finalPos}: "${landedSpecial.label}"!`;
  }

  const won = finalPos === 100;
  const winner = won ? currentSeat : null;

  // Turn management: Rolling a 6 gives another roll unless game is won
  let nextSeat = currentSeat;
  if (!won && !rolledSix) {
    nextSeat = currentSeat === 0 ? 1 : 0;
    consecutiveSixes = 0;
  }

  let eventMsg = `${activeName} rolled ${roll} and moved from ${currentPos} to ${target}.${specialDescription}`;
  if (bounced) {
    eventMsg = `${activeName} rolled ${roll}, overshot tile 100 and bounced back to ${target}.${specialDescription}`;
  }
  if (rolledSix && !won) {
    eventMsg += ` 🎲 Rolled a 6! Roll again!`;
  }
  if (won) {
    eventMsg = `👑 ${activeName} reached tile 100 and won the game!`;
  }

  const nextState: SnakesState = {
    p1Pos: currentSeat === 0 ? finalPos : state.p1Pos,
    p2Pos: currentSeat === 1 ? finalPos : state.p2Pos,
    turnSeat: nextSeat as 0 | 1,
    lastRoll: roll,
    consecutiveSixes,
    lastEvent: eventMsg,
    winner,
    history: [eventMsg, ...state.history].slice(0, 8),
  };

  return {
    nextState,
    landedSpecial,
    rolledSix,
    bounced,
    won,
  };
}

/**
 * Converts a 1-based tile index (1..100) to grid coordinates (0..9 x, 0..9 y).
 * Uses standard zigzag (boustrophedon) board layout:
 * - Row 0 (bottom): 1 (left) to 10 (right)
 * - Row 1: 20 (right) to 11 (left)
 * - ...
 * - Row 9 (top): 100 (left) to 91 (right)
 */
export function getTileGridCoordinates(tileIndex: number): {
  col: number; // 0..9 (from left)
  row: number; // 0..9 (from bottom: 0 is tiles 1-10, 9 is tiles 91-100)
} {
  const clamped = Math.max(1, Math.min(100, tileIndex));
  const zeroBased = clamped - 1;
  const row = Math.floor(zeroBased / 10);
  const remainder = zeroBased % 10;
  const col = row % 2 === 0 ? remainder : 9 - remainder;
  return { col, row };
}
