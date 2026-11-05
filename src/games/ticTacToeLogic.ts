export type TttMark = '' | 'X' | 'O';
export type TttMode = 'classic' | 'bolt';
export type TttOutcome = '' | 'X' | 'O' | 'draw';

export interface TttState {
  mode: TttMode;
  board: TttMark[];
  xOrder: number[];
  oOrder: number[];
  turn: 'X' | 'O';
  winner: TttOutcome;
  winningLine: number[] | null;
}

export const WINNING_LINES: readonly [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createInitialTttState(
  mode: TttMode = 'classic',
  startingTurn: 'X' | 'O' = 'X'
): TttState {
  return {
    mode,
    board: ['', '', '', '', '', '', '', '', ''],
    xOrder: [],
    oOrder: [],
    turn: startingTurn,
    winner: '',
    winningLine: null,
  };
}

export function detectTttWinner(board: TttMark[]): {
  winner: TttOutcome;
  line: number[] | null;
} {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] !== '' && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every((cell) => cell !== '')) {
    return { winner: 'draw', line: null };
  }
  return { winner: '', line: null };
}

export function getFadingCellIndex(state: TttState, mark: 'X' | 'O'): number | null {
  if (state.mode !== 'bolt' || state.winner !== '') return null;
  const order = mark === 'X' ? state.xOrder : state.oOrder;
  return order.length >= 3 ? order[0] : null;
}

export function applyTttMove(state: TttState, index: number): TttState {
  if (state.winner !== '' || index < 0 || index > 8 || state.board[index] !== '') {
    return state;
  }

  const nextBoard = [...state.board];
  let nextXOrder = [...state.xOrder];
  let nextOOrder = [...state.oOrder];

  if (state.turn === 'X') {
    if (state.mode === 'bolt' && nextXOrder.length >= 3) {
      const oldest = nextXOrder.shift()!;
      nextBoard[oldest] = '';
    }
    nextBoard[index] = 'X';
    nextXOrder.push(index);
  } else {
    if (state.mode === 'bolt' && nextOOrder.length >= 3) {
      const oldest = nextOOrder.shift()!;
      nextBoard[oldest] = '';
    }
    nextBoard[index] = 'O';
    nextOOrder.push(index);
  }

  const { winner, line } = detectTttWinner(nextBoard);
  return {
    mode: state.mode,
    board: nextBoard,
    xOrder: nextXOrder.slice(-3),
    oOrder: nextOOrder.slice(-3),
    turn: state.turn === 'X' ? 'O' : 'X',
    winner,
    winningLine: line,
  };
}

export function chooseSmartTttBotMove(state: TttState): number {
  const botMark = state.turn;
  const oppMark: 'X' | 'O' = botMark === 'X' ? 'O' : 'X';
  const available = state.board
    .map((v, idx) => (v === '' ? idx : -1))
    .filter((idx) => idx !== -1);

  if (available.length === 0) return -1;

  // 1. Immediate winning move
  for (const idx of available) {
    const simulated = applyTttMove(state, idx);
    if (simulated.winner === botMark) return idx;
  }

  // 2. Block opponent's immediate win
  const oppState: TttState = { ...state, turn: oppMark };
  for (const idx of available) {
    const simulated = applyTttMove(oppState, idx);
    if (simulated.winner === oppMark) return idx;
  }

  // 3. Take center if free
  if (available.includes(4)) return 4;

  // 4. Take a strategic corner
  const corners = [0, 2, 6, 8].filter((c) => available.includes(c));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  return available[0];
}
