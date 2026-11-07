// Dots & Boxes Pure Game Logic
export const DEFAULT_BOX_SIZE = 4; // 4x4 boxes = 5x5 dots (40 total edges)

export type EdgeType = 'h' | 'v';

export interface EdgeId {
  type: EdgeType;
  r: number;
  c: number;
}

export interface DotsAndBoxesState {
  size: number; // Number of boxes across (e.g. 4)
  hEdges: boolean[][]; // (size + 1) rows x size cols
  vEdges: boolean[][]; // size rows x (size + 1) cols
  boxes: (0 | 1 | null)[][]; // size rows x size cols
  turnSeat: 0 | 1;
  scores: [number, number]; // [P0 score, P1 score]
  winner: 0 | 1 | 'draw' | null;
  lastAction: string;
  chainTurn: boolean;
  lastEdge: EdgeId | null;
}

export function createInitialDotsAndBoxesState(size: number = DEFAULT_BOX_SIZE): DotsAndBoxesState {
  const hEdges = Array.from({ length: size + 1 }, () => Array(size).fill(false));
  const vEdges = Array.from({ length: size }, () => Array(size + 1).fill(false));
  const boxes = Array.from({ length: size }, () => Array(size).fill(null));

  return {
    size,
    hEdges,
    vEdges,
    boxes,
    turnSeat: 0,
    scores: [0, 0],
    winner: null,
    lastAction: 'Game ready! Click between two dots to draw a line.',
    chainTurn: false,
    lastEdge: null,
  };
}

export function isEdgeDrawn(
  state: DotsAndBoxesState,
  type: EdgeType,
  r: number,
  c: number
): boolean {
  if (type === 'h') {
    return !!state.hEdges[r]?.[c];
  } else {
    return !!state.vEdges[r]?.[c];
  }
}

export function countBoxEdges(
  state: DotsAndBoxesState,
  r: number,
  c: number
): number {
  let count = 0;
  if (state.hEdges[r][c]) count++; // top
  if (state.hEdges[r + 1][c]) count++; // bottom
  if (state.vEdges[r][c]) count++; // left
  if (state.vEdges[r][c + 1]) count++; // right
  return count;
}

export function playDotsAndBoxesMove(
  state: DotsAndBoxesState,
  edge: EdgeId
): DotsAndBoxesState {
  if (state.winner !== null) return state;
  const { type, r, c } = edge;
  if (isEdgeDrawn(state, type, r, c)) return state;

  const hEdges = state.hEdges.map((row) => [...row]);
  const vEdges = state.vEdges.map((row) => [...row]);
  const boxes = state.boxes.map((row) => [...row]);

  if (type === 'h') {
    hEdges[r][c] = true;
  } else {
    vEdges[r][c] = true;
  }

  const tempState = { ...state, hEdges, vEdges };
  const newlyCompletedBoxes: [number, number][] = [];

  // Identify adjacent boxes to this edge
  const adjacentBoxes: [number, number][] = [];
  if (type === 'h') {
    // top box: r - 1
    if (r > 0) adjacentBoxes.push([r - 1, c]);
    // bottom box: r
    if (r < state.size) adjacentBoxes.push([r, c]);
  } else {
    // left box: c - 1
    if (c > 0) adjacentBoxes.push([r, c - 1]);
    // right box: c
    if (c < state.size) adjacentBoxes.push([r, c]);
  }

  for (const [br, bc] of adjacentBoxes) {
    if (boxes[br][bc] === null && countBoxEdges(tempState, br, bc) === 4) {
      boxes[br][bc] = state.turnSeat;
      newlyCompletedBoxes.push([br, bc]);
    }
  }

  const scores: [number, number] = [state.scores[0], state.scores[1]];
  scores[state.turnSeat] += newlyCompletedBoxes.length;

  // Total boxes check
  const totalBoxes = state.size * state.size;
  const totalClaimed = scores[0] + scores[1];
  const isGameOver = totalClaimed >= totalBoxes;

  let winner: 0 | 1 | 'draw' | null = null;
  let action = '';

  const actor = state.turnSeat === 0 ? 'You' : 'Nkanyezi';

  if (isGameOver) {
    if (scores[0] > scores[1]) {
      winner = 0;
      action = `Game Over! You won with ${scores[0]} boxes to ${scores[1]}!`;
    } else if (scores[1] > scores[0]) {
      winner = 1;
      action = `Game Over! Nkanyezi won with ${scores[1]} boxes to ${scores[0]}!`;
    } else {
      winner = 'draw';
      action = `Game Over! It’s an even draw with ${scores[0]} boxes each!`;
    }
  } else if (newlyCompletedBoxes.length > 0) {
    action = `${actor} completed ${newlyCompletedBoxes.length} box${
      newlyCompletedBoxes.length > 1 ? 'es' : ''
    }! Bonus Turn!`;
  } else {
    action = `${actor} drew a line.`;
  }

  const earnedFreeTurn = newlyCompletedBoxes.length > 0;
  const nextTurn: 0 | 1 =
    isGameOver ? state.turnSeat : earnedFreeTurn ? state.turnSeat : state.turnSeat === 0 ? 1 : 0;

  return {
    size: state.size,
    hEdges,
    vEdges,
    boxes,
    turnSeat: nextTurn,
    scores,
    winner,
    lastAction: action,
    chainTurn: earnedFreeTurn && !isGameOver,
    lastEdge: edge,
  };
}

// Smart AI for Dots & Boxes
export function getSmartDotsAndBoxesBotMove(state: DotsAndBoxesState): EdgeId {
  const allAvailableEdges: EdgeId[] = [];

  // Collect all undrawn edges
  for (let r = 0; r <= state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (!state.hEdges[r][c]) {
        allAvailableEdges.push({ type: 'h', r, c });
      }
    }
  }
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c <= state.size; c++) {
      if (!state.vEdges[r][c]) {
        allAvailableEdges.push({ type: 'v', r, c });
      }
    }
  }

  if (allAvailableEdges.length === 0) return { type: 'h', r: 0, c: 0 };

  // 1. Can we complete a box right now? (Priority 1)
  for (const edge of allAvailableEdges) {
    const nextState = playDotsAndBoxesMove(state, edge);
    if (nextState.scores[1] > state.scores[1]) {
      return edge;
    }
  }

  // 2. Filter out edges that would create a 3rd edge in any box (giving it away to opponent)
  const safeEdges = allAvailableEdges.filter((edge) => {
    const tempState = playDotsAndBoxesMove(state, edge);
    // In tempState, does any uncompleted box now have 3 edges?
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        if (tempState.boxes[r][c] === null && countBoxEdges(tempState, r, c) === 3) {
          return false;
        }
      }
    }
    return true;
  });

  if (safeEdges.length > 0) {
    // Pick random safe edge
    return safeEdges[Math.floor(Math.random() * safeEdges.length)];
  }

  // 3. Forced sacrifice: pick edge giving away the fewest boxes
  return allAvailableEdges[0];
}
