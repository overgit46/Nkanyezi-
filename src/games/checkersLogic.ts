// Checkers (Draughts) Pure Game Logic
export interface CheckersPiece {
  player: 0 | 1;
  isKing: boolean;
}

export type CheckersCell = CheckersPiece | null;

export interface CheckersMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  isJump: boolean;
  jumpedR?: number;
  jumpedC?: number;
}

export interface CheckersState {
  board: CheckersCell[][]; // 8x8
  turnSeat: 0 | 1;
  winner: 0 | 1 | 'draw' | null;
  multiJumpPiece: { r: number; c: number } | null; // Locked piece in continuous jump sequence
  selectedPiece: { r: number; c: number } | null;
  lastAction: string;
}

export const CHECKERS_SIZE = 8;

export function isDarkSquare(r: number, c: number): boolean {
  return (r + c) % 2 === 1;
}

export function createInitialCheckersState(): CheckersState {
  const board: CheckersCell[][] = Array.from({ length: CHECKERS_SIZE }, () =>
    Array(CHECKERS_SIZE).fill(null)
  );

  // Player 1 (top rows 0, 1, 2)
  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c < CHECKERS_SIZE; c++) {
      if (isDarkSquare(r, c)) {
        board[r][c] = { player: 1, isKing: false };
      }
    }
  }

  // Player 0 (bottom rows 5, 6, 7)
  for (let r = 5; r <= 7; r++) {
    for (let c = 0; c < CHECKERS_SIZE; c++) {
      if (isDarkSquare(r, c)) {
        board[r][c] = { player: 0, isKing: false };
      }
    }
  }

  return {
    board,
    turnSeat: 0,
    winner: null,
    multiJumpPiece: null,
    selectedPiece: null,
    lastAction: 'Game ready! Player 1 (Navy) moves first.',
  };
}

export function getPieceJumps(
  board: CheckersCell[][],
  r: number,
  c: number
): CheckersMove[] {
  const piece = board[r][c];
  if (!piece) return [];
  const jumps: CheckersMove[] = [];
  const directions: [number, number][] = [];

  if (piece.isKing) {
    directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  } else if (piece.player === 0) {
    directions.push([-1, -1], [-1, 1]); // Moving up
  } else {
    directions.push([1, -1], [1, 1]); // Moving down
  }

  for (const [dr, dc] of directions) {
    const midR = r + dr;
    const midC = c + dc;
    const destR = r + 2 * dr;
    const destC = c + 2 * dc;

    if (
      destR >= 0 &&
      destR < CHECKERS_SIZE &&
      destC >= 0 &&
      destC < CHECKERS_SIZE &&
      board[destR][destC] === null
    ) {
      const midPiece = board[midR][midC];
      if (midPiece && midPiece.player !== piece.player) {
        jumps.push({
          fromR: r,
          fromC: c,
          toR: destR,
          toC: destC,
          isJump: true,
          jumpedR: midR,
          jumpedC: midC,
        });
      }
    }
  }

  return jumps;
}

export function getPieceSimpleMoves(
  board: CheckersCell[][],
  r: number,
  c: number
): CheckersMove[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: CheckersMove[] = [];
  const directions: [number, number][] = [];

  if (piece.isKing) {
    directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  } else if (piece.player === 0) {
    directions.push([-1, -1], [-1, 1]);
  } else {
    directions.push([1, -1], [1, 1]);
  }

  for (const [dr, dc] of directions) {
    const destR = r + dr;
    const destC = c + dc;
    if (
      destR >= 0 &&
      destR < CHECKERS_SIZE &&
      destC >= 0 &&
      destC < CHECKERS_SIZE &&
      board[destR][destC] === null
    ) {
      moves.push({
        fromR: r,
        fromC: c,
        toR: destR,
        toC: destC,
        isJump: false,
      });
    }
  }

  return moves;
}

export function getAllLegalMoves(state: CheckersState): CheckersMove[] {
  if (state.winner !== null) return [];

  // If locked in multi-jump sequence
  if (state.multiJumpPiece) {
    return getPieceJumps(
      state.board,
      state.multiJumpPiece.r,
      state.multiJumpPiece.c
    );
  }

  const allJumps: CheckersMove[] = [];
  const allSimple: CheckersMove[] = [];

  for (let r = 0; r < CHECKERS_SIZE; r++) {
    for (let c = 0; c < CHECKERS_SIZE; c++) {
      const piece = state.board[r][c];
      if (piece && piece.player === state.turnSeat) {
        allJumps.push(...getPieceJumps(state.board, r, c));
        allSimple.push(...getPieceSimpleMoves(state.board, r, c));
      }
    }
  }

  // Mandatory capture: if any jumps exist, only jumps are legal
  if (allJumps.length > 0) {
    return allJumps;
  }
  return allSimple;
}

export function playCheckersMove(
  state: CheckersState,
  move: CheckersMove
): CheckersState {
  const legalMoves = getAllLegalMoves(state);
  const isValid = legalMoves.some(
    (m) =>
      m.fromR === move.fromR &&
      m.fromC === move.fromC &&
      m.toR === move.toR &&
      m.toC === move.toC
  );

  if (!isValid) return state;

  const board = state.board.map((row) => [...row]);
  const piece = { ...board[move.fromR][move.fromC]! };

  // Remove moving piece from start
  board[move.fromR][move.fromC] = null;

  // If jump, remove captured piece
  if (move.isJump && move.jumpedR !== undefined && move.jumpedC !== undefined) {
    board[move.jumpedR][move.jumpedC] = null;
  }

  // King promotion check
  let becameKing = false;
  if (!piece.isKing) {
    if (piece.player === 0 && move.toR === 0) {
      piece.isKing = true;
      becameKing = true;
    } else if (piece.player === 1 && move.toR === CHECKERS_SIZE - 1) {
      piece.isKing = true;
      becameKing = true;
    }
  }

  // Place piece at destination
  board[move.toR][move.toC] = piece;

  // Check for multi-jump continuation (only if move was a jump and didn't just become king)
  let nextMultiJumpPiece: { r: number; c: number } | null = null;
  if (move.isJump && !becameKing) {
    const subsequentJumps = getPieceJumps(board, move.toR, move.toC);
    if (subsequentJumps.length > 0) {
      nextMultiJumpPiece = { r: move.toR, c: move.toC };
    }
  }

  const nextTurn: 0 | 1 =
    nextMultiJumpPiece !== null ? state.turnSeat : state.turnSeat === 0 ? 1 : 0;

  // Check victory / draw
  let winner: 0 | 1 | 'draw' | null = null;
  const simulatedState = {
    ...state,
    board,
    turnSeat: nextTurn,
    multiJumpPiece: nextMultiJumpPiece,
    winner: null,
  };

  const nextOpponentMoves = getAllLegalMoves(simulatedState);
  if (nextOpponentMoves.length === 0) {
    winner = state.turnSeat;
  }

  const actor = state.turnSeat === 0 ? 'You' : 'Nkanyezi';
  let actionText = `${actor} moved.`;
  if (move.isJump) {
    actionText = `${actor} jumped and captured a piece!`;
  }
  if (becameKing) {
    actionText = `${actor} reached the back rank — Crowned King! 👑`;
  }
  if (winner !== null) {
    actionText = `Game Over! ${actor} wins! 🏆`;
  }

  return {
    board,
    turnSeat: nextTurn,
    winner,
    multiJumpPiece: nextMultiJumpPiece,
    selectedPiece: nextMultiJumpPiece,
    lastAction: actionText,
  };
}

// Smart AI for Checkers
export function getSmartCheckersBotMove(state: CheckersState): CheckersMove | null {
  const legal = getAllLegalMoves(state);
  if (legal.length === 0) return null;

  // 1. Prefer jumps (already enforced if jumps exist)
  const jumps = legal.filter((m) => m.isJump);
  if (jumps.length > 0) {
    // Pick jump that promotes or leads to more jumps
    return jumps[Math.floor(Math.random() * jumps.length)];
  }

  // 2. Prefer moves toward the center or kinging
  legal.sort((a, b) => {
    // Prefer advancing
    const advanceA = a.toR;
    const advanceB = b.toR;
    return advanceB - advanceA;
  });

  return legal[0];
}
