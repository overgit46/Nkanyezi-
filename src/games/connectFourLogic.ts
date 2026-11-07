// Connect Four (Four-in-a-Row) Pure Logic
export type ConnectFourCell = 0 | 1 | null; // 0 = Player 1 (You), 1 = Player 2 (Nkanyezi)

export interface ConnectFourState {
  board: ConnectFourCell[][]; // 6 rows (0 top, 5 bottom) x 7 cols (0-6)
  turnSeat: 0 | 1;
  winner: 0 | 1 | 'draw' | null;
  winningCoords: [number, number][] | null; // Coordinates of the 4 winning tokens
  lastMove: { row: number; col: number } | null;
  moveHistory: { seat: 0 | 1; row: number; col: number }[];
}

export const C4_ROWS = 6;
export const C4_COLS = 7;

export function createInitialConnectFourState(): ConnectFourState {
  const board: ConnectFourCell[][] = Array.from({ length: C4_ROWS }, () =>
    Array(C4_COLS).fill(null)
  );
  return {
    board,
    turnSeat: 0,
    winner: null,
    winningCoords: null,
    lastMove: null,
    moveHistory: [],
  };
}

export function getLowestEmptyRow(board: ConnectFourCell[][], col: number): number {
  if (col < 0 || col >= C4_COLS) return -1;
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) {
      return r;
    }
  }
  return -1;
}

export function isColumnFull(board: ConnectFourCell[][], col: number): boolean {
  return board[0][col] !== null;
}

export function checkConnectFourWinner(
  board: ConnectFourCell[][]
): { winner: 0 | 1 | null; winningCoords: [number, number][] | null } {
  // Check horizontal
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c <= C4_COLS - 4; c++) {
      const val = board[r][c];
      if (val !== null &&
          val === board[r][c + 1] &&
          val === board[r][c + 2] &&
          val === board[r][c + 3]) {
        return {
          winner: val,
          winningCoords: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]],
        };
      }
    }
  }

  // Check vertical
  for (let c = 0; c < C4_COLS; c++) {
    for (let r = 0; r <= C4_ROWS - 4; r++) {
      const val = board[r][c];
      if (val !== null &&
          val === board[r + 1][c] &&
          val === board[r + 2][c] &&
          val === board[r + 3][c]) {
        return {
          winner: val,
          winningCoords: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]],
        };
      }
    }
  }

  // Check diagonal (down-right \)
  for (let r = 0; r <= C4_ROWS - 4; r++) {
    for (let c = 0; c <= C4_COLS - 4; c++) {
      const val = board[r][c];
      if (val !== null &&
          val === board[r + 1][c + 1] &&
          val === board[r + 2][c + 2] &&
          val === board[r + 3][c + 3]) {
        return {
          winner: val,
          winningCoords: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]],
        };
      }
    }
  }

  // Check diagonal (up-right /)
  for (let r = 3; r < C4_ROWS; r++) {
    for (let c = 0; c <= C4_COLS - 4; c++) {
      const val = board[r][c];
      if (val !== null &&
          val === board[r - 1][c + 1] &&
          val === board[r - 2][c + 2] &&
          val === board[r - 3][c + 3]) {
        return {
          winner: val,
          winningCoords: [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]],
        };
      }
    }
  }

  return { winner: null, winningCoords: null };
}

export function isBoardFull(board: ConnectFourCell[][]): boolean {
  for (let c = 0; c < C4_COLS; c++) {
    if (board[0][c] === null) return false;
  }
  return true;
}

export function playConnectFourMove(
  state: ConnectFourState,
  col: number
): ConnectFourState {
  if (state.winner !== null) return state;
  const row = getLowestEmptyRow(state.board, col);
  if (row === -1) return state; // Invalid move

  const newBoard = state.board.map((r, ri) =>
    r.map((c, ci) => (ri === row && ci === col ? state.turnSeat : c))
  );

  const { winner, winningCoords } = checkConnectFourWinner(newBoard);
  const isDraw = !winner && isBoardFull(newBoard);

  const nextTurn: 0 | 1 = state.turnSeat === 0 ? 1 : 0;

  return {
    board: newBoard,
    turnSeat: winner !== null || isDraw ? state.turnSeat : nextTurn,
    winner: winner !== null ? winner : isDraw ? 'draw' : null,
    winningCoords,
    lastMove: { row, col },
    moveHistory: [...state.moveHistory, { seat: state.turnSeat, row, col }],
  };
}

// Smart AI for Nkanyezi
export function getSmartConnectFourBotMove(
  state: ConnectFourState,
  botSeat: 0 | 1 = 1
): number {
  const opponentSeat: 0 | 1 = botSeat === 0 ? 1 : 0;
  const legalCols: number[] = [];
  for (let c = 0; c < C4_COLS; c++) {
    if (!isColumnFull(state.board, c)) {
      legalCols.push(c);
    }
  }

  if (legalCols.length === 0) return 3;

  // 1. Can bot win immediately?
  for (const c of legalCols) {
    const r = getLowestEmptyRow(state.board, c);
    const testBoard = state.board.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? botSeat : cell))
    );
    if (checkConnectFourWinner(testBoard).winner === botSeat) {
      return c;
    }
  }

  // 2. Must bot block opponent from winning?
  for (const c of legalCols) {
    const r = getLowestEmptyRow(state.board, c);
    const testBoard = state.board.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? opponentSeat : cell))
    );
    if (checkConnectFourWinner(testBoard).winner === opponentSeat) {
      return c;
    }
  }

  // 3. Avoid giving opponent a win right above us!
  const safeCols = legalCols.filter((c) => {
    const r = getLowestEmptyRow(state.board, c);
    if (r <= 0) return true;
    const testBoard = state.board.map((row, ri) =>
      row.map((cell, ci) => (ri === r - 1 && ci === c ? opponentSeat : cell))
    );
    return checkConnectFourWinner(testBoard).winner !== opponentSeat;
  });

  const candidatePool = safeCols.length > 0 ? safeCols : legalCols;

  // 4. Prefer center columns (3, then 2 & 4, then 1 & 5, then 0 & 6)
  const preferenceOrder = [3, 2, 4, 1, 5, 0, 6];
  for (const c of preferenceOrder) {
    if (candidatePool.includes(c)) return c;
  }

  return candidatePool[0];
}
