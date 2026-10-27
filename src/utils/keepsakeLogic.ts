import { MemoryPhoto, PhotoCategory } from '../data/keepsakeData';

export interface SavedReplyNote {
  id: string;
  message: string;
  mood: string;
  createdAtLabel: string;
}

export interface KeepsakeState {
  kissCount: number;
  heartedQualityIds: string[];
  claimedVoucherId: string | null;
  letterUnsealed: boolean;
  savedNotes: SavedReplyNote[];
}

export const INITIAL_KEEPSAKE_STATE: KeepsakeState = {
  kissCount: 14,
  heartedQualityIds: ['honesty', 'just-you'],
  claimedVoucherId: null,
  letterUnsealed: false,
  savedNotes: [],
};

export function filterMemoriesByCategory(
  photos: MemoryPhoto[],
  category: PhotoCategory
): MemoryPhoto[] {
  if (category === 'all') {
    return photos;
  }
  return photos.filter((photo) => photo.category === category);
}

export function getCyclicPhotoIndex(
  currentIndex: number,
  direction: 'next' | 'prev',
  total: number
): number {
  if (total <= 0) return 0;
  if (direction === 'next') {
    return (currentIndex + 1) % total;
  }
  return (currentIndex - 1 + total) % total;
}

export function toggleHeartedQuality(
  heartedIds: string[],
  qualityId: string
): string[] {
  if (heartedIds.includes(qualityId)) {
    return heartedIds.filter((id) => id !== qualityId);
  }
  return [...heartedIds, qualityId];
}

export interface NoteValidationResult {
  valid: boolean;
  error?: string;
  cleanedMessage?: string;
}

export function validateReplyNote(rawInput: string): NoteValidationResult {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Write a quick word or feeling first before saving your note.',
    };
  }
  if (trimmed.length > 280) {
    return {
      valid: false,
      error: 'Keep your pocket note under 280 characters so it fits nicely on the card.',
    };
  }
  return {
    valid: true,
    cleanedMessage: trimmed,
  };
}

export function containsStandaloneEnglishStar(text: string): boolean {
  return /\bstar\b/i.test(text);
}
