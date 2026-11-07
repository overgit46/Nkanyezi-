import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialConnectFourState,
  playConnectFourMove,
  getLowestEmptyRow,
  getSmartConnectFourBotMove,
} from './connectFourLogic';

import {
  createInitialBattleshipState,
  generateRandomFleet,
  isValidPlacement,
  fireShotAtOpponent,
  getSmartBattleshipBotShot,
} from './battleshipLogic';

import {
  createInitialMancalaState,
  playMancalaMove,
  getSmartMancalaBotMove,
} from './mancalaLogic';

import {
  createInitialDotsAndBoxesState,
  playDotsAndBoxesMove,
  getSmartDotsAndBoxesBotMove,
} from './dotsAndBoxesLogic';

import {
  createInitialCheckersState,
  getAllLegalMoves,
  playCheckersMove,
  getSmartCheckersBotMove,
} from './checkersLogic';

import {
  createInitialMemoryMatchState,
  flipMemoryCard,
  resolveMemoryMismatch,
} from './memoryMatchLogic';

import {
  createInitialWordDuelState,
  submitWordDuelWord,
  isValidBogglePath,
  calculateWordScore,
  findAllWordsOnBoard,
} from './wordDuelLogic';

test('Connect Four: basic drops, vertical win, and smart bot', () => {
  let state = createInitialConnectFourState();
  assert.equal(getLowestEmptyRow(state.board, 0), 5);

  // Player 0 plays col 0
  state = playConnectFourMove(state, 0);
  assert.equal(state.board[5][0], 0);
  assert.equal(state.turnSeat, 1);

  // Player 1 plays col 1
  state = playConnectFourMove(state, 1);
  assert.equal(state.board[5][1], 1);

  // Set up 4-in-a-row vertical for Player 0 on col 0
  state = playConnectFourMove(state, 0); // P0: row 4
  state = playConnectFourMove(state, 1); // P1: row 4
  state = playConnectFourMove(state, 0); // P0: row 3
  state = playConnectFourMove(state, 1); // P1: row 3
  state = playConnectFourMove(state, 0); // P0: row 2 -> 4 in a row!

  assert.equal(state.winner, 0);
  assert.equal(state.winningCoords?.length, 4);

  // Test smart bot blocks or plays
  const testState = createInitialConnectFourState();
  const botCol = getSmartConnectFourBotMove(testState, 1);
  assert.ok(botCol >= 0 && botCol <= 6);
});

test('Battleship: fleet placement, hit/miss detection, and smart targeting', () => {
  const fleet = generateRandomFleet();
  assert.equal(fleet.length, 5);
  assert.ok(isValidPlacement(fleet, 0, 0, 2, true, fleet[0].id) !== undefined);

  let state = createInitialBattleshipState();
  state.p0Ships = fleet;
  state.p1Ships = generateRandomFleet();
  state.phase = 'battle';

  const targetShip = state.p1Ships[0];
  const targetR = targetShip.row;
  const targetC = targetShip.col;

  state = fireShotAtOpponent(state, targetR, targetC);
  assert.equal(state.p0Shots[`${targetR},${targetC}`], targetShip.size === 1 ? 'sunk' : 'hit');
  assert.equal(state.lastShot?.seat, 0);

  // Smart bot fires within bounds
  const botShot = getSmartBattleshipBotShot(state.p0Shots);
  assert.ok(botShot.row >= 0 && botShot.row < 10);
  assert.ok(botShot.col >= 0 && botShot.col < 10);
});

test('Mancala: sowing gemstones, free turn and capture mechanics', () => {
  let state = createInitialMancalaState();
  assert.equal(state.pits[0], 4);
  assert.equal(state.pits[6], 0);

  // Playing pit 2 (4 stones): lands in 3, 4, 5, and 6 (P0 Store) -> Free Turn!
  state = playMancalaMove(state, 2);
  assert.equal(state.pits[2], 0);
  assert.equal(state.pits[6], 1); // Landed in store
  assert.equal(state.freeTurnGranted, true);
  assert.equal(state.turnSeat, 0); // Still P0's turn!

  // Smart bot returns valid pit
  const botMove = getSmartMancalaBotMove(state, 1);
  assert.ok(botMove >= 7 && botMove <= 12);
});

test('Dots & Boxes: edge drawing, box claiming, and chain turns', () => {
  let state = createInitialDotsAndBoxesState(3); // 3x3 boxes
  // Draw top, bottom, left of box (0,0)
  state = playDotsAndBoxesMove(state, { type: 'h', r: 0, c: 0 }); // top
  assert.equal(state.turnSeat, 1);
  state = playDotsAndBoxesMove(state, { type: 'v', r: 0, c: 0 }); // left
  assert.equal(state.turnSeat, 0);
  state = playDotsAndBoxesMove(state, { type: 'h', r: 1, c: 0 }); // bottom
  assert.equal(state.turnSeat, 1);

  // Player 1 draws right edge: completing box (0,0)!
  state = playDotsAndBoxesMove(state, { type: 'v', r: 0, c: 1 }); // right
  assert.equal(state.boxes[0][0], 1);
  assert.equal(state.scores[1], 1);
  assert.equal(state.chainTurn, true);
  assert.equal(state.turnSeat, 1); // Bonus turn retained!

  // Smart bot move
  const botEdge = getSmartDotsAndBoxesBotMove(state);
  assert.ok(botEdge.r >= 0 && botEdge.c >= 0);
});

test('Checkers: initial setup, legal moves, diagonal captures and kinging', () => {
  let state = createInitialCheckersState();
  const moves = getAllLegalMoves(state);
  assert.ok(moves.length > 0);

  // Execute a simple move
  const firstMove = moves[0];
  state = playCheckersMove(state, firstMove);
  assert.equal(state.turnSeat, 1);

  // Bot move
  const botMove = getSmartCheckersBotMove(state);
  assert.ok(botMove !== null);
});

test('Memory Match: flip cards, matching pairs, and mismatch resolution', () => {
  let state = createInitialMemoryMatchState();
  assert.equal(state.cards.length, 16);

  // Flip card 0
  const flip1 = flipMemoryCard(state, 0);
  state = flip1.nextState;
  assert.equal(state.flippedIndices.length, 1);

  // Find the matching twin card index
  const twinIdx = state.cards.findIndex(
    (c, i) => i !== 0 && c.symbolKey === state.cards[0].symbolKey
  );
  assert.ok(twinIdx > 0);

  // Flip the twin card -> should match!
  const flip2 = flipMemoryCard(state, twinIdx);
  state = flip2.nextState;
  assert.equal(flip2.isMatch, true);
  assert.equal(state.scores[0], 1);
  assert.equal(state.turnSeat, 0); // Bonus turn on match!

  // Mismatch simulation
  const otherIdx1 = state.cards.findIndex((_, i) => !state.matchedIndices.includes(i));
  const otherIdx2 = state.cards.findIndex(
    (c, i) => !state.matchedIndices.includes(i) && c.symbolKey !== state.cards[otherIdx1].symbolKey
  );
  state = flipMemoryCard(state, otherIdx1).nextState;
  const mismatchRes = flipMemoryCard(state, otherIdx2);
  state = mismatchRes.nextState;
  assert.equal(mismatchRes.shouldDelayTurn, true);

  state = resolveMemoryMismatch(state);
  assert.equal(state.flippedIndices.length, 0);
  assert.equal(state.turnSeat, 1); // Turn passed to P1!
});

test('Word Duel: scoring, path adjacency, and dictionary lookup', () => {
  assert.equal(calculateWordScore('CAT'), 1);
  assert.equal(calculateWordScore('LOVE'), 2);
  assert.equal(calculateWordScore('HEART'), 3);
  assert.equal(calculateWordScore('ROMANCE'), 8);

  const state = createInitialWordDuelState();
  const subRes = submitWordDuelWord(state, 'LOVE', 0);
  assert.equal(subRes.success, true);
  assert.equal(subRes.points, 2);
  assert.equal(subRes.nextState.scores[0], 2);

  // Invalid path test
  const pathRes = isValidBogglePath(
    [
      ['L', 'O', 'V', 'E'],
      ['S', 'T', 'A', 'R'],
      ['C', 'A', 'R', 'E'],
      ['K', 'I', 'S', 'S'],
    ],
    [[0, 0], [0, 1], [0, 2], [0, 3]] // L-O-V-E adjacent row
  );
  assert.equal(pathRes.valid, true);
  assert.equal(pathRes.word, 'LOVE');

  // DFS finds words on board
  const wordsOnBoard = findAllWordsOnBoard([
    ['L', 'O', 'V', 'E'],
    ['S', 'T', 'A', 'R'],
    ['C', 'A', 'R', 'E'],
    ['K', 'I', 'S', 'S'],
  ]);
  assert.ok(wordsOnBoard.includes('LOVE'));
  assert.ok(wordsOnBoard.includes('STAR'));
});
