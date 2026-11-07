/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export const P0_ENTRY_SQUARE = 0;
export const P0_HOMESTRETCH_GATE = 51; // Square after which P0 enters home stretch
export const P0_HOME_START = 100;
export const P0_GOAL = 105;

export const P1_ENTRY_SQUARE = 26;
export const P1_HOMESTRETCH_GATE = 25; // Square after which P1 enters home stretch
export const P1_HOME_START = 200;
export const P1_GOAL = 205;

export type LudoPhase = 'need_roll' | 'need_move' | 'game_over';

export interface LudoState {
  tokens: [number, number, number, number]; // [p0_t0, p0_t1, p1_t0, p1_t1]
  turnSeat: 0 | 1;
  phase: LudoPhase;
  lastDice: number; // 0..6
  consecutiveSixes: number; // 0..3
  lastAction: string;
  winner: 0 | 1 | null;
  history: string[];
}

export function createInitialLudoState(): LudoState {
  return {
    tokens: [-1, -1, -1, -1],
    turnSeat: 0,
    phase: 'need_roll',
    lastDice: 0,
    consecutiveSixes: 0,
    lastAction: 'Couple’s Ludo ready! Roll a 6 to bring your first token out onto the board.',
    winner: null,
    history: [],
  };
}

export function isTokenInGoal(tokenPos: number, seat: 0 | 1): boolean {
  return seat === 0 ? tokenPos === P0_GOAL : tokenPos === P1_GOAL;
}

export function isPlayerWon(tokens: [number, number, number, number], seat: 0 | 1): boolean {
  if (seat === 0) {
    return isTokenInGoal(tokens[0], 0) && isTokenInGoal(tokens[1], 0);
  }
  return isTokenInGoal(tokens[2], 1) && isTokenInGoal(tokens[3], 1);
}

/**
 * Calculates the destination square for a given token moving by `dice`.
 * Returns null if the move is invalid (e.g. Overshooting the goal or base without a 6).
 */
export function getDestinationSquare(
  pos: number,
  dice: number,
  seat: 0 | 1
): number | null {
  // 1. In Yard Base: requires a 6 to enter
  if (pos === -1) {
    return dice === 6 ? (seat === 0 ? P0_ENTRY_SQUARE : P1_ENTRY_SQUARE) : null;
  }

  // 2. Already in Goal: cannot move further
  if (isTokenInGoal(pos, seat)) {
    return null;
  }

  // 3. Inside Home Stretch
  if (seat === 0 && pos >= P0_HOME_START) {
    const next = pos + dice;
    if (next <= P0_GOAL) return next;
    return null; // Overshot goal
  }
  if (seat === 1 && pos >= P1_HOME_START) {
    const next = pos + dice;
    if (next <= P1_GOAL) return next;
    return null; // Overshot goal
  }

  // 4. On Main Outer Ring (0..51)
  if (seat === 0) {
    // Check if move enters home stretch past tile 51
    // Player 0 started at 0. If pos + dice > 51, it turns into home stretch
    if (pos <= P0_HOMESTRETCH_GATE && pos + dice > P0_HOMESTRETCH_GATE) {
      const stepsIntoStretch = pos + dice - (P0_HOMESTRETCH_GATE + 1);
      const target = P0_HOME_START + stepsIntoStretch;
      return target <= P0_GOAL ? target : null;
    }
    return (pos + dice) % 52;
  } else {
    // Player 1 started at 26. Loops 26 -> 51 -> 0 -> 25, then enters stretch past 25
    // Condition to enter stretch: current pos is between 0 and 25, and pos + dice > 25
    // Or if pos was between 26 and 51, it simply wraps into 0..25 without entering stretch yet
    const crossedZero = pos >= 26 && pos + dice >= 52;
    if (pos <= P1_HOMESTRETCH_GATE && pos + dice > P1_HOMESTRETCH_GATE) {
      const stepsIntoStretch = pos + dice - (P1_HOMESTRETCH_GATE + 1);
      const target = P1_HOME_START + stepsIntoStretch;
      return target <= P1_GOAL ? target : null;
    }
    return (pos + dice) % 52;
  }
}

/**
 * Returns list of token indices [0, 1] for P0 or [2, 3] for P1 that can legally move with `dice`.
 */
export function getLegalTokenIndices(
  state: LudoState,
  dice: number,
  seat: 0 | 1 = state.turnSeat
): number[] {
  const tokenIndices = seat === 0 ? [0, 1] : [2, 3];
  const legals: number[] = [];

  for (const idx of tokenIndices) {
    const dest = getDestinationSquare(state.tokens[idx], dice, seat);
    if (dest !== null) {
      legals.push(idx);
    }
  }

  return legals;
}

export interface RollResult {
  nextState: LudoState;
  legalTokens: number[];
  autoMovedToken: number | null;
}

export function handleLudoDiceRoll(
  state: LudoState,
  roll: number,
  player1Name = 'You',
  player2Name = 'Nkanyezi'
): RollResult {
  if (state.phase === 'game_over' || state.winner !== null) {
    return { nextState: state, legalTokens: [], autoMovedToken: null };
  }

  const currentSeat = state.turnSeat;
  const activeName = currentSeat === 0 ? player1Name : player2Name;
  const partnerName = currentSeat === 0 ? player2Name : player1Name;

  let consecutiveSixes = roll === 6 ? state.consecutiveSixes + 1 : 0;

  // 3 sixes penalty
  if (consecutiveSixes >= 3) {
    const nextSeat = currentSeat === 0 ? 1 : 0;
    const action = `${activeName} rolled 3 sixes in a row! Turn forfeited to ${partnerName}.`;
    return {
      nextState: {
        ...state,
        turnSeat: nextSeat as 0 | 1,
        phase: 'need_roll',
        lastDice: roll,
        consecutiveSixes: 0,
        lastAction: action,
        history: [action, ...state.history].slice(0, 8),
      },
      legalTokens: [],
      autoMovedToken: null,
    };
  }

  const legals = getLegalTokenIndices(state, roll, currentSeat);

  // If no legal moves available, turn passes unless rolled a 6
  if (legals.length === 0) {
    const nextSeat = roll === 6 ? currentSeat : currentSeat === 0 ? 1 : 0;
    const action =
      roll === 6
        ? `${activeName} rolled a 6 but had no valid moves! Rolling again.`
        : `${activeName} rolled a ${roll} with no moves available. Turn passed to ${partnerName}.`;
    return {
      nextState: {
        ...state,
        turnSeat: nextSeat as 0 | 1,
        phase: 'need_roll',
        lastDice: roll,
        consecutiveSixes,
        lastAction: action,
        history: [action, ...state.history].slice(0, 8),
      },
      legalTokens: [],
      autoMovedToken: null,
    };
  }

  // If there are legal moves, transition to 'need_move'
  const action = `${activeName} rolled a ${roll}! Tap a highlighted token to move.`;
  return {
    nextState: {
      ...state,
      phase: 'need_move',
      lastDice: roll,
      consecutiveSixes,
      lastAction: action,
    },
    legalTokens: legals,
    autoMovedToken: null,
  };
}

export interface MoveResult {
  nextState: LudoState;
  capturedOpponent: boolean;
  reachedGoal: boolean;
  won: boolean;
  bonusTurn: boolean;
}

export function executeLudoTokenMove(
  state: LudoState,
  tokenIndex: number,
  player1Name = 'You',
  player2Name = 'Nkanyezi'
): MoveResult {
  const currentSeat = state.turnSeat;
  const dice = state.lastDice;
  const currentPos = state.tokens[tokenIndex];
  const dest = getDestinationSquare(currentPos, dice, currentSeat);

  if (dest === null) {
    return {
      nextState: state,
      capturedOpponent: false,
      reachedGoal: false,
      won: false,
      bonusTurn: false,
    };
  }

  const activeName = currentSeat === 0 ? player1Name : player2Name;
  const partnerName = currentSeat === 0 ? player2Name : player1Name;
  const newTokens: [number, number, number, number] = [...state.tokens];
  newTokens[tokenIndex] = dest;

  let capturedOpponent = false;
  let bonusTurn = dice === 6;

  // Check capture on main ring if square is not safe
  if (dest >= 0 && dest <= 51 && !SAFE_SQUARES.has(dest)) {
    const opponentIndices = currentSeat === 0 ? [2, 3] : [0, 1];
    for (const oppIdx of opponentIndices) {
      if (newTokens[oppIdx] === dest) {
        newTokens[oppIdx] = -1; // Send back to base!
        capturedOpponent = true;
        bonusTurn = true; // Capturing grants a bonus roll in authentic Ludo!
        break;
      }
    }
  }

  const reachedGoal = isTokenInGoal(dest, currentSeat);
  if (reachedGoal) {
    bonusTurn = true; // Reaching goal grants an extra turn
  }

  const won = isPlayerWon(newTokens, currentSeat);
  const nextSeat = won || bonusTurn ? currentSeat : currentSeat === 0 ? 1 : 0;

  let action = `${activeName} moved token ${currentPos === -1 ? 'onto track' : `to square ${dest}`}.`;
  if (capturedOpponent) {
    action = `💥 ${activeName} captured ${partnerName}’s token back to base! Bonus roll granted!`;
  } else if (reachedGoal) {
    action = `🌟 ${activeName} brought a token safely into the Home Goal!`;
  } else if (dice === 6) {
    action += ` 🎲 Rolled a 6! Roll again!`;
  }

  if (won) {
    action = `👑 ${activeName} brought all tokens home and won the game!`;
  }

  const nextState: LudoState = {
    tokens: newTokens,
    turnSeat: nextSeat as 0 | 1,
    phase: won ? 'game_over' : 'need_roll',
    lastDice: dice,
    consecutiveSixes: bonusTurn ? state.consecutiveSixes : 0,
    lastAction: action,
    winner: won ? currentSeat : null,
    history: [action, ...state.history].slice(0, 8),
  };

  return {
    nextState,
    capturedOpponent,
    reachedGoal,
    won,
    bonusTurn,
  };
}

/**
 * Intelligent bot move selection for solo play:
 * 1. Prioritize capturing opponent
 * 2. Prioritize entering Goal
 * 3. Prioritize emerging from Base with 6
 * 4. Prioritize advancing token furthest or safest
 */
export function pickSmartBotMove(state: LudoState): number | null {
  const dice = state.lastDice;
  const legals = getLegalTokenIndices(state, dice, state.turnSeat);
  if (legals.length === 0) return null;
  if (legals.length === 1) return legals[0];

  const currentSeat = state.turnSeat;
  const opponentIndices = currentSeat === 0 ? [2, 3] : [0, 1];
  const opponentPositions = opponentIndices.map((i) => state.tokens[i]);

  let bestScore = -999;
  let bestIdx = legals[0];

  for (const idx of legals) {
    const currentPos = state.tokens[idx];
    const dest = getDestinationSquare(currentPos, dice, currentSeat);
    if (dest === null) continue;

    let score = 0;

    // Check capture
    if (dest >= 0 && dest <= 51 && !SAFE_SQUARES.has(dest)) {
      if (opponentPositions.includes(dest)) {
        score += 100;
      }
    }

    // Check goal
    if (isTokenInGoal(dest, currentSeat)) {
      score += 80;
    }

    // Emerging from base
    if (currentPos === -1 && dest !== -1) {
      score += 50;
    }

    // Landing on safe square
    if (SAFE_SQUARES.has(dest)) {
      score += 25;
    }

    // Advancing progress
    score += currentPos >= 0 ? 10 : 0;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }

  return bestIdx;
}
