import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './client';

export const MAX_LETTER_TITLE_LEN = 80;
export const MAX_LETTER_CONTENT_LEN = 3000;
export const MAX_LETTER_MOOD_LEN = 40;

export interface RoomLetterDoc {
  id: string;
  roomId: string;
  authorUid: string;
  authorName: string;
  authorRole: 'host' | 'guest';
  title: string;
  content: string;
  mood: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface NewLetterPayload {
  title?: string;
  content: string;
  mood: string;
  authorName: string;
  authorRole: 'host' | 'guest';
}

export function sanitizeLetterText(raw: string, maxLen: number): string {
  return raw.trim().slice(0, maxLen);
}

export async function sendRoomLetter(
  roomId: string,
  payload: NewLetterPayload
): Promise<string> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('Please sign in to share a letter in your couple room.');
  }

  const cleanContent = sanitizeLetterText(payload.content, MAX_LETTER_CONTENT_LEN);
  if (!cleanContent) {
    throw new Error('Please write your letter before sending.');
  }

  const letterId = `let_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const docPath = `rooms/${roomId}/letters/${letterId}`;
  const letterRef = doc(db, 'rooms', roomId, 'letters', letterId);

  const data = {
    roomId,
    authorUid: currentUid,
    authorName: sanitizeLetterText(payload.authorName, 40) || 'Love',
    authorRole: payload.authorRole,
    title: sanitizeLetterText(payload.title || '', MAX_LETTER_TITLE_LEN),
    content: cleanContent,
    mood: sanitizeLetterText(payload.mood || 'Feeling Loved', MAX_LETTER_MOOD_LEN),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(letterRef, data);
    return letterId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateRoomLetter(
  roomId: string,
  letterId: string,
  updates: { title?: string; content?: string; mood?: string }
): Promise<void> {
  const docPath = `rooms/${roomId}/letters/${letterId}`;
  const letterRef = doc(db, 'rooms', roomId, 'letters', letterId);

  const cleanUpdates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (typeof updates.title === 'string') {
    cleanUpdates.title = sanitizeLetterText(updates.title, MAX_LETTER_TITLE_LEN);
  }
  if (typeof updates.content === 'string') {
    cleanUpdates.content = sanitizeLetterText(updates.content, MAX_LETTER_CONTENT_LEN);
  }
  if (typeof updates.mood === 'string') {
    cleanUpdates.mood = sanitizeLetterText(updates.mood, MAX_LETTER_MOOD_LEN);
  }

  try {
    await updateDoc(letterRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteRoomLetter(
  roomId: string,
  letterId: string
): Promise<void> {
  const docPath = `rooms/${roomId}/letters/${letterId}`;
  const letterRef = doc(db, 'rooms', roomId, 'letters', letterId);
  try {
    await deleteDoc(letterRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeToRoomLetters(
  roomId: string,
  onLetters: (letters: RoomLetterDoc[]) => void,
  onFatalError?: (message: string) => void
): () => void {
  if (!auth.currentUser || !roomId) {
    onLetters([]);
    return () => {};
  }

  const collPath = `rooms/${roomId}/letters`;
  const q = query(collection(db, 'rooms', roomId, 'letters'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: RoomLetterDoc[] = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data();
        return {
          id: docSnap.id,
          roomId: raw.roomId ?? roomId,
          authorUid: raw.authorUid ?? '',
          authorName: raw.authorName ?? 'Love',
          authorRole: raw.authorRole === 'guest' ? 'guest' : 'host',
          title: raw.title ?? '',
          content: raw.content ?? '',
          mood: raw.mood ?? 'Feeling Loved',
          createdAt: raw.createdAt as Timestamp | undefined,
          updatedAt: raw.updatedAt as Timestamp | undefined,
        };
      });
      onLetters(items);
    },
    (error) => {
      if (onFatalError) onFatalError(error.message);
      try {
        handleFirestoreError(error, OperationType.LIST, collPath);
      } catch {
        // Handled & logged structured FirestoreErrorInfo
      }
    }
  );
}
