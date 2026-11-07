import { CardCode, CardTableState, CardVariant, Suit } from './cardGamesLogic';
import { CelebrityOutcome } from './celebrityLogic';
import { detectTttWinner, TttMark, TttMode, TttOutcome, TttState } from './ticTacToeLogic';
import { SnakesState } from './snakesLogic';
import { LudoState } from './ludoLogic';

export const MAX_CARD_ACTION_LEN = 120;
export const MAX_QA_LEN = 160;
export const MAX_REVEALED_NAME_LEN = 80;
export const MAX_EVENT_LEN = 120;

export interface TttRoomMap {
  mode: TttMode;
  board: string; // 9 chars matching ^[.XO]{9}$
  order: string; // e.g. "048|12" matching ^[0-8|]*$
  winner: TttOutcome;
}

export interface CardsRoomMap {
  variant: CardVariant;
  seatCount: 2 | 4;
  deck: string[]; // Tagged tokens: S:<code/>, D:<code/>, 0..3:<code/>, P:<seat>:<code/>
  activeSuit: Suit;
  direction: 1 | -1;
  pendingDraw: number;
  trickScores: [number, number, number, number];
  lastAction: string;
  winnerSeat: number;
}

export interface CelebRoomMap {
  clueGiverUid: string;
  roundId: string;
  category: string;
  questionCount: number;
  lastQA: string;
  revealedName: string;
  outcome: CelebrityOutcome;
}

export interface SnakesRoomMap {
  p1Pos: number;
  p2Pos: number;
  lastRoll: number;
  consecutiveSixes: number;
  lastEvent: string;
  winnerSeat: number;
}

export interface LudoRoomMap {
  tokens: [number, number, number, number];
  phase: 'need_roll' | 'need_move' | 'game_over';
  lastDice: number;
  consecutiveSixes: number;
  lastAction: string;
  winnerSeat: number;
}

export function tttStateToMap(state: TttState): TttRoomMap {
  const boardStr = state.board
    .slice(0, 9)
    .map((cell) => (cell === 'X' || cell === 'O' ? cell : '.'))
    .join('')
    .padEnd(9, '.');
  const xPart = state.xOrder.filter((n) => n >= 0 && n <= 8).slice(0, 5).join('');
  const oPart = state.oOrder.filter((n) => n >= 0 && n <= 8).slice(0, 5).join('');
  return {
    mode: state.mode,
    board: boardStr,
    order: `${xPart}|${oPart}`.slice(0, 12),
    winner: state.winner,
  };
}

export function tttStateFromMap(ttt: TttRoomMap, turnSeat: number): TttState {
  const rawBoard = typeof ttt.board === 'string' && ttt.board.length === 9 ? ttt.board : '.........';
  const board: TttMark[] = Array.from(rawBoard).map((ch) =>
    ch === 'X' ? 'X' : ch === 'O' ? 'O' : ''
  );
  const [xRaw = '', oRaw = ''] = (ttt.order ?? '|').split('|');
  const parseDigits = (s: string): number[] =>
    Array.from(s)
      .map((c) => Number(c))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 8);

  const { winner, line } = detectTttWinner(board);
  return {
    mode: ttt.mode,
    board,
    xOrder: parseDigits(xRaw),
    oOrder: parseDigits(oRaw),
    turn: turnSeat === 0 ? 'X' : 'O',
    winner: ttt.winner || winner,
    winningLine: line,
  };
}

export function cardStateToMap(table: CardTableState): CardsRoomMap {
  const deck: string[] = [];
  for (const c of table.stock) deck.push(`S:${c}`);
  for (const c of table.discard) deck.push(`D:${c}`);
  for (let seat = 0; seat < 4; seat++) {
    for (const c of table.hands[seat] ?? []) {
      deck.push(`${seat}:${c}`);
    }
  }
  for (const p of table.trickPot) {
    deck.push(`P:${p}`);
  }

  return {
    variant: table.variant,
    seatCount: table.seatCount,
    deck: deck.slice(0, 64),
    activeSuit: table.activeSuit,
    direction: table.direction,
    pendingDraw: Math.max(0, Math.min(16, table.pendingDraw)),
    trickScores: table.trickScores,
    lastAction: table.lastAction.slice(0, MAX_CARD_ACTION_LEN),
    winnerSeat: table.winnerSeat,
  };
}

export function cardStateFromMap(cards: CardsRoomMap, turnSeat: number): CardTableState {
  const stock: CardCode[] = [];
  const discard: CardCode[] = [];
  const hands: [CardCode[], CardCode[], CardCode[], CardCode[]] = [[], [], [], []];
  const trickPot: string[] = [];

  for (const token of cards.deck ?? []) {
    if (token.startsWith('S:')) {
      stock.push(token.slice(2) as CardCode);
    } else if (token.startsWith('D:')) {
      discard.push(token.slice(2) as CardCode);
    } else if (token.startsWith('0:')) {
      hands[0].push(token.slice(2) as CardCode);
    } else if (token.startsWith('1:')) {
      hands[1].push(token.slice(2) as CardCode);
    } else if (token.startsWith('2:')) {
      hands[2].push(token.slice(2) as CardCode);
    } else if (token.startsWith('3:')) {
      hands[3].push(token.slice(2) as CardCode);
    } else if (token.startsWith('P:')) {
      trickPot.push(token.slice(2));
    }
  }

  return {
    variant: cards.variant,
    seatCount: cards.seatCount,
    stock,
    discard,
    hands,
    activeSuit: cards.activeSuit,
    turnSeat,
    direction: cards.direction,
    pendingDraw: cards.pendingDraw,
    trickPot,
    trickScores: cards.trickScores,
    lastAction: cards.lastAction,
    winnerSeat: cards.winnerSeat,
  };
}

export function snakesStateToMap(state: SnakesState): SnakesRoomMap {
  return {
    p1Pos: Math.max(1, Math.min(100, state.p1Pos)),
    p2Pos: Math.max(1, Math.min(100, state.p2Pos)),
    lastRoll: Math.max(0, Math.min(6, state.lastRoll)),
    consecutiveSixes: Math.max(0, Math.min(3, state.consecutiveSixes)),
    lastEvent: state.lastEvent.slice(0, MAX_EVENT_LEN),
    winnerSeat: state.winner !== null ? state.winner : -1,
  };
}

export function snakesStateFromMap(map: SnakesRoomMap, turnSeat: number): SnakesState {
  return {
    p1Pos: typeof map.p1Pos === 'number' ? map.p1Pos : 1,
    p2Pos: typeof map.p2Pos === 'number' ? map.p2Pos : 1,
    turnSeat: (turnSeat === 1 ? 1 : 0) as 0 | 1,
    lastRoll: typeof map.lastRoll === 'number' ? map.lastRoll : 0,
    consecutiveSixes: typeof map.consecutiveSixes === 'number' ? map.consecutiveSixes : 0,
    lastEvent: typeof map.lastEvent === 'string' ? map.lastEvent : 'Roll to start!',
    winner: map.winnerSeat === 0 || map.winnerSeat === 1 ? map.winnerSeat : null,
    history: map.lastEvent ? [map.lastEvent] : [],
  };
}

export function ludoStateToMap(state: LudoState): LudoRoomMap {
  return {
    tokens: [
      state.tokens[0],
      state.tokens[1],
      state.tokens[2],
      state.tokens[3],
    ],
    phase: state.phase,
    lastDice: Math.max(0, Math.min(6, state.lastDice)),
    consecutiveSixes: Math.max(0, Math.min(3, state.consecutiveSixes)),
    lastAction: state.lastAction.slice(0, MAX_EVENT_LEN),
    winnerSeat: state.winner !== null ? state.winner : -1,
  };
}

export function ludoStateFromMap(map: LudoRoomMap, turnSeat: number): LudoState {
  const tokens: [number, number, number, number] =
    Array.isArray(map.tokens) && map.tokens.length === 4
      ? [map.tokens[0], map.tokens[1], map.tokens[2], map.tokens[3]]
      : [-1, -1, -1, -1];

  return {
    tokens,
    turnSeat: (turnSeat === 1 ? 1 : 0) as 0 | 1,
    phase: map.phase in ['need_roll', 'need_move', 'game_over'] ? map.phase : 'need_roll',
    lastDice: typeof map.lastDice === 'number' ? map.lastDice : 0,
    consecutiveSixes: typeof map.consecutiveSixes === 'number' ? map.consecutiveSixes : 0,
    lastAction: typeof map.lastAction === 'string' ? map.lastAction : 'Roll to start!',
    winner: map.winnerSeat === 0 || map.winnerSeat === 1 ? map.winnerSeat : null,
    history: map.lastAction ? [map.lastAction] : [],
  };
}
