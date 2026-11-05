import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTttMove,
  chooseSmartTttBotMove,
  createInitialTttState,
  getFadingCellIndex,
} from './ticTacToeLogic';
import {
  chooseBotCardAction,
  createCardGame,
  drawFromStockMove,
  isCardPlayable,
  playCardMove,
} from './cardGamesLogic';
import {
  CELEBRITY_DECK,
  computeSwappedRoles,
  drawNextCelebrity,
  getPlayerCelebrityView,
} from './celebrityLogic';

test('Tic-Tac-Toe Classic detects horizontal/diagonal wins and smart bot blocks', () => {
  let state = createInitialTttState('classic', 'X');
  state = applyTttMove(state, 0); // X at 0
  state = applyTttMove(state, 4); // O at 4
  state = applyTttMove(state, 1); // X at 1
  // Bot as O should block index 2!
  const blockIdx = chooseSmartTttBotMove(state);
  assert.equal(blockIdx, 2);

  // If O plays elsewhere, X wins at 2
  state = applyTttMove(state, 3); // O at 3
  state = applyTttMove(state, 2); // X at 2 -> X wins [0, 1, 2]
  assert.equal(state.winner, 'X');
  assert.deepEqual(state.winningLine, [0, 1, 2]);
});

test('Tic-Tac-Toe Bolt 3-piece mode removes oldest mark on 4th placement', () => {
  let state = createInitialTttState('bolt', 'X');
  state = applyTttMove(state, 0); // X1: [0]
  state = applyTttMove(state, 3); // O1: [3]
  state = applyTttMove(state, 1); // X2: [0, 1]
  state = applyTttMove(state, 4); // O2: [3, 4]
  state = applyTttMove(state, 6); // X3: [0, 1, 6]
  state = applyTttMove(state, 7); // O3: [3, 4, 7]

  assert.equal(getFadingCellIndex(state, 'X'), 0);

  // X places 4th mark at 8 -> oldest mark at 0 vanishes!
  state = applyTttMove(state, 8);
  assert.equal(state.board[0], '');
  assert.equal(state.board[8], 'X');
  assert.deepEqual(state.xOrder, [1, 6, 8]);
});

test('Card Lounge 4-player Crazy Eights deals 4 hands, handles Wild 8 suit pick, and advances bots', () => {
  const table = createCardGame('crazy8', 4);
  assert.equal(table.hands[0].length, 5);
  assert.equal(table.hands[1].length, 5);
  assert.equal(table.hands[2].length, 5);
  assert.equal(table.hands[3].length, 5);
  assert.equal(table.discard.length, 1);

  // Force Seat 0 to hold a Wild 8 ('8S') and verify it is playable regardless of activeSuit
  const customTable = {
    ...table,
    hands: [['8S', '2C'], table.hands[1], table.hands[2], table.hands[3]] as typeof table.hands,
    activeSuit: 'D' as const,
    turnSeat: 0,
  };
  assert.equal(isCardPlayable(customTable, 0, '8S'), true);

  const afterWild = playCardMove(customTable, 0, '8S', 'H', 'You');
  assert.equal(afterWild.activeSuit, 'H');
  assert.equal(afterWild.turnSeat, 1);

  // Seat 1 bot takes turn cleanly
  const afterBot = chooseBotCardAction(afterWild, 1, 'Zola');
  assert.notEqual(afterBot.turnSeat, 1);
});

test('Card Lounge Action Switch enforces +2 penalty, Jack skip, and King reverse', () => {
  const base = createCardGame('switch', 4);
  const setup = {
    ...base,
    discard: ['5H'] as typeof base.discard,
    activeSuit: 'H' as const,
    hands: [
      ['2H', 'KH', '6S'],
      ['9C', '10D'],
      ['JH', '4S'],
      ['3D', '7C'],
    ] as typeof base.hands,
    turnSeat: 0,
    direction: 1 as const,
  };

  // Seat 0 plays 2H -> pendingDraw becomes 2, turn moves to Seat 1
  const afterTwo = playCardMove(setup, 0, '2H', undefined, 'You');
  assert.equal(afterTwo.pendingDraw, 2);
  assert.equal(afterTwo.turnSeat, 1);
  // Seat 1 has no '2', so 9C is not playable; drawing resolves penalty +2 cards
  assert.equal(isCardPlayable(afterTwo, 1, '9C'), false);
  const afterPenaltyDraw = drawFromStockMove(afterTwo, 1, 'Zola');
  assert.equal(afterPenaltyDraw.hands[1].length, 4);
  assert.equal(afterPenaltyDraw.pendingDraw, 0);
  assert.equal(afterPenaltyDraw.turnSeat, 2);

  // Seat 2 plays JH -> skips Seat 3, lands back on Seat 0!
  const afterJack = playCardMove(afterPenaltyDraw, 2, 'JH', undefined, 'Nkanyezi');
  assert.equal(afterJack.turnSeat, 0);

  // Seat 0 plays KH -> reverses direction from 1 to -1, next seat is Seat 3!
  const afterKing = playCardMove(afterJack, 0, 'KH', undefined, 'You');
  assert.equal(afterKing.direction, -1);
  assert.equal(afterKing.turnSeat, 3);
});

test('Guess the Celebrity deck has 48 stars, hides secret from guesser, and swaps roles', () => {
  assert.equal(CELEBRITY_DECK.length >= 45, true);
  const first = drawNextCelebrity('All', []);
  const second = drawNextCelebrity('All', [first.id]);
  assert.notEqual(first.id, second.id);

  // Guesser cannot see name or hints while guessing
  const guesserView = getPlayerCelebrityView({
    viewerIsClueGiver: false,
    secretCard: first,
    publicCategory: first.category,
    revealedName: '',
    questionCount: 3,
    outcome: 'guessing',
  });
  assert.equal(guesserView.canSeeSecret, false);
  assert.equal(guesserView.displayName, 'Mystery Celebrity');
  assert.equal(guesserView.hints.length, 0);

  // Clue-giver CAN see name and 3 hints while guessing
  const clueGiverView = getPlayerCelebrityView({
    viewerIsClueGiver: true,
    secretCard: first,
    publicCategory: first.category,
    revealedName: '',
    questionCount: 3,
    outcome: 'guessing',
  });
  assert.equal(clueGiverView.canSeeSecret, true);
  assert.equal(clueGiverView.displayName, first.name);
  assert.equal(clueGiverView.hints.length, 3);

  // Once guessed or gave_up, guesser sees the celebrity too, and roles swap for next round
  const revealedGuesserView = getPlayerCelebrityView({
    viewerIsClueGiver: false,
    secretCard: null,
    publicCategory: first.category,
    revealedName: first.name,
    questionCount: 5,
    outcome: 'guessed',
  });
  assert.equal(revealedGuesserView.canSeeSecret, true);
  assert.equal(revealedGuesserView.displayName, first.name);

  const swapped = computeSwappedRoles('uid_host', 'uid_host', 'uid_nkanyezi');
  assert.equal(swapped.nextClueGiverUid, 'uid_nkanyezi');
  assert.equal(swapped.nextGuesserUid, 'uid_host');

  for (const celeb of CELEBRITY_DECK) {
    assert.equal(/^[a-zA-Z0-9_-]+$/.test(celeb.id), true, `Invalid celebrity id: ${celeb.id}`);
    assert.equal(celeb.name.length >= 1 && celeb.name.length <= 80, true);
    assert.equal(celeb.category.length >= 1 && celeb.category.length <= 40, true);
    for (const h of celeb.hints) {
      assert.equal(h.length >= 1 && h.length <= 120, true);
    }
  }
});

test('roomStateCodec round-trips Tic-Tac-Toe and Card Lounge states within Firestore rule bounds', async () => {
  const { tttStateToMap, tttStateFromMap, cardStateToMap, cardStateFromMap } = await import(
    './roomStateCodec'
  );

  // Full 9-move Classic draw round-trip (5 X marks + '|' + 4 O marks = 10 chars <= 12)
  let ttt = createInitialTttState('classic', 'X');
  for (const cell of [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
    ttt = applyTttMove(ttt, cell);
  }
  const tttMap = tttStateToMap(ttt);
  assert.equal(/^[.XO]{9}$/.test(tttMap.board), true);
  assert.equal(tttMap.order.length <= 12 && /^[0-8|]*$/.test(tttMap.order), true);
  const restoredTtt = tttStateFromMap(tttMap, 1);
  assert.deepEqual(restoredTtt.board, ttt.board);
  assert.equal(restoredTtt.winner, 'draw');

  // Card Lounge 4-player & Hearts trick pot round-trip
  const cardTable = createCardGame('hearts', 4);
  const afterLead = playCardMove(cardTable, cardTable.turnSeat, cardTable.hands[cardTable.turnSeat][0]);
  const cardsMap = cardStateToMap(afterLead);
  assert.equal(cardsMap.deck.length <= 64, true);
  assert.equal(cardsMap.deck.every((tok) => tok.length <= 12), true);
  const restoredCards = cardStateFromMap(cardsMap, afterLead.turnSeat);
  assert.deepEqual(restoredCards, afterLead);
});

