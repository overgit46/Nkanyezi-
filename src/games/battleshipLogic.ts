// Battleship Naval Fleet Command Pure Logic
export const BS_SIZE = 10;

export interface ShipDef {
  id: string;
  name: string;
  size: number;
}

export const SHIP_DEFS: ShipDef[] = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

export interface PlacedShip {
  id: string;
  name: string;
  size: number;
  row: number; // Top-left anchor row (0-9)
  col: number; // Top-left anchor col (0-9)
  horizontal: boolean;
  hits: number; // Count of hits received
}

export type ShotResult = 'hit' | 'miss' | 'sunk';

export interface ShotRecord {
  seat: 0 | 1;
  row: number;
  col: number;
  result: ShotResult;
  sunkShipName?: string;
}

export interface BattleshipState {
  phase: 'placement' | 'battle' | 'gameover';
  turnSeat: 0 | 1;
  winner: 0 | 1 | null;
  p0Ships: PlacedShip[];
  p1Ships: PlacedShip[];
  // Shots fired by P0 against P1
  p0Shots: Record<string, ShotResult>; // key "r,c"
  // Shots fired by P1 against P0
  p1Shots: Record<string, ShotResult>; // key "r,c"
  lastShot: ShotRecord | null;
  history: ShotRecord[];
}

export function createInitialBattleshipState(): BattleshipState {
  return {
    phase: 'placement',
    turnSeat: 0,
    winner: null,
    p0Ships: [],
    p1Ships: [],
    p0Shots: {},
    p1Shots: {},
    lastShot: null,
    history: [],
  };
}

export function isValidPlacement(
  ships: PlacedShip[],
  row: number,
  col: number,
  size: number,
  horizontal: boolean,
  ignoreShipId?: string
): boolean {
  if (row < 0 || col < 0) return false;
  if (horizontal) {
    if (col + size > BS_SIZE || row >= BS_SIZE) return false;
  } else {
    if (row + size > BS_SIZE || col >= BS_SIZE) return false;
  }

  // Check collision with existing ships
  const occupied = new Set<string>();
  for (const s of ships) {
    if (ignoreShipId && s.id === ignoreShipId) continue;
    for (let i = 0; i < s.size; i++) {
      const r = s.horizontal ? s.row : s.row + i;
      const c = s.horizontal ? s.col + i : s.col;
      occupied.add(`${r},${c}`);
    }
  }

  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (occupied.has(`${r},${c}`)) return false;
  }

  return true;
}

export function generateRandomFleet(): PlacedShip[] {
  const result: PlacedShip[] = [];
  for (const def of SHIP_DEFS) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const horizontal = Math.random() < 0.5;
      const maxR = horizontal ? BS_SIZE - 1 : BS_SIZE - def.size;
      const maxC = horizontal ? BS_SIZE - def.size : BS_SIZE - 1;
      const r = Math.floor(Math.random() * (maxR + 1));
      const c = Math.floor(Math.random() * (maxC + 1));
      if (isValidPlacement(result, r, c, def.size, horizontal)) {
        result.push({
          id: def.id,
          name: def.name,
          size: def.size,
          row: r,
          col: c,
          horizontal,
          hits: 0,
        });
        placed = true;
      }
    }
  }
  return result;
}

export function fireShotAtOpponent(
  state: BattleshipState,
  row: number,
  col: number
): BattleshipState {
  if (state.phase !== 'battle') return state;
  const coordKey = `${row},${col}`;
  const isP0Firing = state.turnSeat === 0;
  const targetShots = isP0Firing ? state.p0Shots : state.p1Shots;
  const targetShips = isP0Firing ? state.p1Ships : state.p0Ships;

  // Already fired here?
  if (targetShots[coordKey]) return state;

  // Check if hit a ship
  let hitShip: PlacedShip | null = null;
  for (const s of targetShips) {
    for (let i = 0; i < s.size; i++) {
      const r = s.horizontal ? s.row : s.row + i;
      const c = s.horizontal ? s.col + i : s.col;
      if (r === row && c === col) {
        hitShip = s;
        break;
      }
    }
    if (hitShip) break;
  }

  let result: ShotResult = 'miss';
  let sunkShipName: string | undefined = undefined;

  let updatedTargetShips = targetShips;

  if (hitShip) {
    const updatedShip: PlacedShip = { ...hitShip, hits: hitShip.hits + 1 };
    updatedTargetShips = targetShips.map((s) => (s.id === hitShip!.id ? updatedShip : s));
    if (updatedShip.hits >= updatedShip.size) {
      result = 'sunk';
      sunkShipName = updatedShip.name;
    } else {
      result = 'hit';
    }
  }

  const updatedShots = { ...targetShots, [coordKey]: result };

  // Check victory: all ships sunk
  const allSunk = updatedTargetShips.every((s) => s.hits >= s.size);
  const winner = allSunk ? state.turnSeat : null;
  const nextPhase = allSunk ? 'gameover' : 'battle';
  const nextTurn: 0 | 1 = state.turnSeat === 0 ? 1 : 0;

  const record: ShotRecord = {
    seat: state.turnSeat,
    row,
    col,
    result,
    sunkShipName,
  };

  return {
    ...state,
    phase: nextPhase,
    winner,
    turnSeat: allSunk ? state.turnSeat : nextTurn,
    p0Ships: isP0Firing ? state.p0Ships : updatedTargetShips,
    p1Ships: isP0Firing ? updatedTargetShips : state.p1Ships,
    p0Shots: isP0Firing ? updatedShots : state.p0Shots,
    p1Shots: isP0Firing ? state.p1Shots : updatedShots,
    lastShot: record,
    history: [record, ...state.history].slice(0, 50),
  };
}

// Smart AI (Hunt & Target mode)
export function getSmartBattleshipBotShot(
  shotsTaken: Record<string, ShotResult>
): { row: number; col: number } {
  // 1. Look for un-sunk hits to target adjacent cells
  const hits: { r: number; c: number }[] = [];
  for (const [key, res] of Object.entries(shotsTaken)) {
    if (res === 'hit') {
      const [rStr, cStr] = key.split(',');
      hits.push({ r: Number(rStr), c: Number(cStr) });
    }
  }

  if (hits.length > 0) {
    // Target mode: test neighbors of known hits
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    // Check if there are 2 aligned hits to prioritize the line
    if (hits.length >= 2) {
      const h0 = hits[0];
      const h1 = hits[1];
      const isHorizontal = h0.r === h1.r;
      const isVertical = h0.c === h1.c;

      for (const h of hits) {
        const lineDirs = isHorizontal
          ? [[0, -1], [0, 1]]
          : isVertical
          ? [[-1, 0], [1, 0]]
          : directions;

        for (const [dr, dc] of lineDirs) {
          const nr = h.r + dr;
          const nc = h.c + dc;
          if (nr >= 0 && nr < BS_SIZE && nc >= 0 && nc < BS_SIZE) {
            if (!shotsTaken[`${nr},${nc}`]) {
              return { row: nr, col: nc };
            }
          }
        }
      }
    }

    for (const h of hits) {
      for (const [dr, dc] of directions) {
        const nr = h.r + dr;
        const nc = h.c + dc;
        if (nr >= 0 && nr < BS_SIZE && nc >= 0 && nc < BS_SIZE) {
          if (!shotsTaken[`${nr},${nc}`]) {
            return { row: nr, col: nc };
          }
        }
      }
    }
  }

  // 2. Hunt mode: Parity checkerboard search (r + c is even)
  const candidateCoords: { row: number; col: number }[] = [];
  for (let r = 0; r < BS_SIZE; r++) {
    for (let c = 0; c < BS_SIZE; c++) {
      if ((r + c) % 2 === 0 && !shotsTaken[`${r},${c}`]) {
        candidateCoords.push({ row: r, col: c });
      }
    }
  }

  if (candidateCoords.length > 0) {
    return candidateCoords[Math.floor(Math.random() * candidateCoords.length)];
  }

  // Fallback: any remaining cell
  for (let r = 0; r < BS_SIZE; r++) {
    for (let c = 0; c < BS_SIZE; c++) {
      if (!shotsTaken[`${r},${c}`]) {
        return { row: r, col: c };
      }
    }
  }

  return { row: 0, col: 0 };
}
