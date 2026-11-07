import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './client';
import { CardTableState, createCardGame } from '../games/cardGamesLogic';
import { CelebrityCard, drawNextCelebrity } from '../games/celebrityLogic';
import { createInitialTttState, TttState } from '../games/ticTacToeLogic';
import {
  CardsRoomMap,
  cardStateFromMap,
  cardStateToMap,
  CelebRoomMap,
  MAX_CARD_ACTION_LEN,
  MAX_QA_LEN,
  MAX_REVEALED_NAME_LEN,
  TttRoomMap,
  tttStateFromMap,
  tttStateToMap,
  SnakesRoomMap,
  snakesStateFromMap,
  snakesStateToMap,
  LudoRoomMap,
  ludoStateFromMap,
  ludoStateToMap,
} from '../games/roomStateCodec';
import { createInitialSnakesState, SnakesState } from '../games/snakesLogic';
import { createInitialLudoState, LudoState } from '../games/ludoLogic';

export {
  cardStateToMap,
  MAX_CARD_ACTION_LEN,
  MAX_QA_LEN,
  MAX_REVEALED_NAME_LEN,
  tttStateToMap,
  snakesStateToMap,
  ludoStateToMap,
};
export type { CardsRoomMap, CelebRoomMap, TttRoomMap, SnakesRoomMap, LudoRoomMap };

export type ActiveGameKind = 'tictactoe' | 'cards' | 'celebrity' | 'snakes' | 'ludo';
export type RoomStatus = 'waiting' | 'playing' | 'round_over' | 'closed';

// Blueprint-synchronized validation constants
export const ROOM_CODE_REGEX = /^[A-Z0-9]+$/;
export const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const MAX_NAME_LEN = 40;

export interface GameRoomDoc {
  roomCode: string;
  hostUid: string;
  hostName: string;
  guestUid: string;
  guestName: string;
  activeGame: ActiveGameKind;
  roomStatus: RoomStatus;
  turnSeat: number;
  hostScore: number;
  guestScore: number;
  roundNumber: number;
  ttt: TttRoomMap;
  cards: CardsRoomMap;
  celeb: CelebRoomMap;
  snakes: SnakesRoomMap;
  ludo: LudoRoomMap;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CelebritySecretDoc {
  roomId: string;
  roundId: string;
  clueGiverUid: string;
  celebrityId: string;
  celebrityName: string;
  category: string;
  hints: string[];
  createdAt?: Timestamp;
}

export function sanitizeDisplayName(raw: string | null | undefined, fallback: string): string {
  const cleaned = (raw ?? '').trim().slice(0, MAX_NAME_LEN);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `NK${suffix}`;
}

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

export function tttStateFromRoom(room: GameRoomDoc): TttState {
  return tttStateFromMap(room.ttt, room.turnSeat);
}

export function cardStateFromRoom(room: GameRoomDoc): CardTableState {
  return cardStateFromMap(room.cards, room.turnSeat);
}

export function snakesStateFromRoom(room: GameRoomDoc): SnakesState {
  return snakesStateFromMap(room.snakes, room.turnSeat);
}

export function ludoStateFromRoom(room: GameRoomDoc): LudoState {
  return ludoStateFromMap(room.ludo, room.turnSeat);
}

export function cardStateToRoomFields(table: CardTableState): {
  turnSeat: number;
  cards: CardsRoomMap;
} {
  return {
    turnSeat: table.turnSeat,
    cards: cardStateToMap(table),
  };
}

export async function createMultiplayerRoom(
  hostUid: string,
  rawHostName: string,
  initialGame: ActiveGameKind
): Promise<string> {
  const roomCode = generateRoomCode();
  const hostName = sanitizeDisplayName(rawHostName, 'Player 1');
  const initialTtt = createInitialTttState('bolt', 'X');
  const initialCards = createCardGame('crazy8', 4);
  const initialSnakes = createInitialSnakesState();
  const initialLudo = createInitialLudoState();

  const roomPath = `rooms/${roomCode}`;

  const roomPayload = {
    roomCode,
    hostUid,
    hostName,
    guestUid: '',
    guestName: '',
    activeGame: initialGame,
    roomStatus: 'waiting' as const,
    turnSeat: initialCards.turnSeat,
    hostScore: 0,
    guestScore: 0,
    roundNumber: 1,
    ttt: tttStateToMap(initialTtt),
    cards: cardStateToMap(initialCards),
    celeb: {
      clueGiverUid: hostUid,
      roundId: '',
      category: 'All',
      questionCount: 0,
      lastQA: '',
      revealedName: '',
      outcome: 'guessing' as const,
    },
    snakes: snakesStateToMap(initialSnakes),
    ludo: ludoStateToMap(initialLudo),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'rooms', roomCode), roomPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }

  if (initialGame === 'celebrity') {
    const firstCeleb = drawNextCelebrity('All', []);
    await startNewCelebrityRoundOnline({
      roomCode,
      clueGiverUid: hostUid,
      nextRoundNumber: 1,
      roomStatus: 'waiting',
      card: firstCeleb,
    });
  }

  return roomCode;
}

export async function joinMultiplayerRoom(
  rawCode: string,
  guestUid: string,
  rawGuestName: string
): Promise<string> {
  const code = normalizeRoomCode(rawCode);
  if (code.length < 4 || !ROOM_CODE_REGEX.test(code)) {
    throw new Error('Enter a valid 6-character room code (for example NK4829).');
  }

  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);

  let snap;
  try {
    snap = await getDoc(roomRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, roomPath);
  }

  if (!snap.exists()) {
    throw new Error(`No room found with code ${code}. Double-check the code on the other phone.`);
  }

  const data = snap.data() as GameRoomDoc;
  if (data.hostUid === guestUid || data.guestUid === guestUid) {
    return code; // Rejoining own active room
  }
  if (data.roomStatus !== 'waiting' || data.guestUid !== '') {
    throw new Error('That room already has two players connected.');
  }

  const guestName = sanitizeDisplayName(rawGuestName, 'Nkanyezi');
  try {
    await updateDoc(roomRef, {
      guestUid,
      guestName,
      roomStatus: 'playing',
      updatedAt: serverTimestamp(),
    });
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

export async function updateRoomGameplay(
  roomCode: string,
  fields: Record<string, unknown>
): Promise<void> {
  const roomPath = `rooms/${roomCode}`;
  try {
    await updateDoc(doc(db, 'rooms', roomCode), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

export async function startNewCelebrityRoundOnline(params: {
  roomCode: string;
  clueGiverUid: string;
  nextRoundNumber: number;
  roomStatus?: 'waiting' | 'playing';
  card: CelebrityCard;
}): Promise<void> {
  const {
    roomCode,
    clueGiverUid,
    nextRoundNumber,
    roomStatus = 'playing',
    card,
  } = params;
  const roundId = `r${nextRoundNumber}_${Date.now()}`;
  const roomRef = doc(db, 'rooms', roomCode);
  const secretRef = doc(db, 'rooms', roomCode, 'secrets', roundId);

  try {
    const batch = writeBatch(db);
    batch.update(roomRef, {
      activeGame: 'celebrity',
      roomStatus,
      roundNumber: nextRoundNumber,
      celeb: {
        clueGiverUid,
        roundId,
        category: card.category.slice(0, 40),
        questionCount: 0,
        lastQA: '',
        revealedName: '',
        outcome: 'guessing',
      },
      updatedAt: serverTimestamp(),
    });
    batch.set(secretRef, {
      roomId: roomCode,
      roundId,
      clueGiverUid,
      celebrityId: card.id,
      celebrityName: card.name.slice(0, MAX_REVEALED_NAME_LEN),
      category: card.category.slice(0, 40),
      hints: card.hints.map((h) => h.slice(0, 120)).slice(0, 5),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `rooms/${roomCode}/secrets/${roundId}`
    );
  }
}

export function subscribeToRoom(
  roomCode: string,
  onRoom: (room: GameRoomDoc | null) => void,
  onFatalError?: (message: string) => void
): () => void {
  if (!auth.currentUser) return () => {};
  const roomPath = `rooms/${roomCode}`;
  return onSnapshot(
    doc(db, 'rooms', roomCode),
    (snapshot) => {
      if (!snapshot.exists()) {
        onRoom(null);
        return;
      }
      onRoom(snapshot.data() as GameRoomDoc);
    },
    (error) => {
      if (onFatalError) {
        onFatalError(error.message);
      }
      try {
        handleFirestoreError(error, OperationType.GET, roomPath);
      } catch {
        // Logged structured FirestoreErrorInfo via handleFirestoreError
      }
    }
  );
}

export function subscribeToSecretCard(
  roomCode: string,
  roundId: string,
  canRead: boolean,
  onSecret: (secret: CelebritySecretDoc | null) => void
): () => void {
  if (!auth.currentUser || !canRead || !roundId || !ID_REGEX.test(roundId)) {
    onSecret(null);
    return () => {};
  }
  const secretPath = `rooms/${roomCode}/secrets/${roundId}`;
  return onSnapshot(
    doc(db, 'rooms', roomCode, 'secrets', roundId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onSecret(null);
        return;
      }
      onSecret(snapshot.data() as CelebritySecretDoc);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, secretPath);
      } catch {
        // Logged structured FirestoreErrorInfo
      }
    }
  );
}
