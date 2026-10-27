/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { MEMORY_PHOTOS, MemoryPhoto } from './data/keepsakeData';
import {
  INITIAL_KEEPSAKE_STATE,
  KeepsakeState,
  SavedReplyNote,
  toggleHeartedQuality,
} from './utils/keepsakeLogic';
import { TopBar } from './components/TopBar';
import { HeroSection } from './components/HeroSection';
import { MarqueeDivider } from './components/MarqueeDivider';
import { QualitiesSection } from './components/QualitiesSection';
import { GallerySection } from './components/GallerySection';
import { OpenWhenSection } from './components/OpenWhenSection';
import { LoveLetterSection } from './components/LoveLetterSection';
import { PhotoLightboxModal } from './components/PhotoLightboxModal';

const STORAGE_KEY = 'nkanyezi_keepsake_v1';

function loadInitialState(): KeepsakeState {
  if (typeof window === 'undefined') {
    return INITIAL_KEEPSAKE_STATE;
  }

  const params = new URLSearchParams(window.location.search);
  const autoUnseal = params.get('autostart') === '1';

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...INITIAL_KEEPSAKE_STATE,
        letterUnsealed: autoUnseal,
      };
    }
    const parsed = JSON.parse(raw) as Partial<KeepsakeState>;
    return {
      kissCount:
        typeof parsed.kissCount === 'number'
          ? parsed.kissCount
          : INITIAL_KEEPSAKE_STATE.kissCount,
      heartedQualityIds: Array.isArray(parsed.heartedQualityIds)
        ? parsed.heartedQualityIds
        : INITIAL_KEEPSAKE_STATE.heartedQualityIds,
      claimedVoucherId:
        typeof parsed.claimedVoucherId === 'string' ? parsed.claimedVoucherId : null,
      letterUnsealed: autoUnseal || Boolean(parsed.letterUnsealed),
      savedNotes: Array.isArray(parsed.savedNotes) ? parsed.savedNotes : [],
    };
  } catch {
    return {
      ...INITIAL_KEEPSAKE_STATE,
      letterUnsealed: autoUnseal,
    };
  }
}

export default function App() {
  const [state, setState] = useState<KeepsakeState>(loadInitialState);
  const [selectedPhoto, setSelectedPhoto] = useState<MemoryPhoto | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [state]);

  const handleSendKiss = () => {
    setState((prev) => ({
      ...prev,
      kissCount: prev.kissCount + 1,
    }));
  };

  const handleToggleHeartQuality = (qualityId: string) => {
    setState((prev) => ({
      ...prev,
      heartedQualityIds: toggleHeartedQuality(prev.heartedQualityIds, qualityId),
    }));
  };

  const handleOpenAndScrollToLetter = () => {
    setState((prev) => ({
      ...prev,
      letterUnsealed: true,
    }));
    const el = document.getElementById('letter');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggleLetter = (open: boolean) => {
    setState((prev) => ({
      ...prev,
      letterUnsealed: open,
    }));
  };

  const handleClaimVoucher = (voucherId: string) => {
    setState((prev) => ({
      ...prev,
      claimedVoucherId: prev.claimedVoucherId === voucherId ? null : voucherId,
    }));
  };

  const handleAddNote = (message: string, mood: string) => {
    const now = new Date();
    const createdAtLabel = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const newNote: SavedReplyNote = {
      id: `${Date.now()}`,
      message,
      mood,
      createdAtLabel,
    };
    setState((prev) => ({
      ...prev,
      savedNotes: [newNote, ...prev.savedNotes],
    }));
  };

  const handleDeleteNote = (noteId: string) => {
    setState((prev) => ({
      ...prev,
      savedNotes: prev.savedNotes.filter((n) => n.id !== noteId),
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF9] text-[#1F1518]">
      <TopBar onOpenLetter={handleOpenAndScrollToLetter} />

      <main className="flex-1">
        <HeroSection
          kissCount={state.kissCount}
          heartedCount={state.heartedQualityIds.length}
          onSendKiss={handleSendKiss}
          onOpenLetter={handleOpenAndScrollToLetter}
          onSelectPhoto={setSelectedPhoto}
        />

        <MarqueeDivider />

        <QualitiesSection
          heartedIds={state.heartedQualityIds}
          onToggleHeart={handleToggleHeartQuality}
        />

        <GallerySection onSelectPhoto={setSelectedPhoto} />

        <OpenWhenSection />

        <LoveLetterSection
          letterUnsealed={state.letterUnsealed}
          onToggleLetter={handleToggleLetter}
          claimedVoucherId={state.claimedVoucherId}
          onClaimVoucher={handleClaimVoucher}
          savedNotes={state.savedNotes}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
        />
      </main>

      <footer className="py-10 bg-[#FDFBF9] border-t border-[#EFE3E7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C6573]">
          <p className="font-editorial text-sm text-[#4F3B42]">
            Crafted from scratch exclusively for Nkanyezi.
          </p>
          <div className="flex items-center gap-4">
            <a href="#top" className="hover:text-[#1F1518] transition-colors py-1">
              Back to Top
            </a>
            <span aria-hidden="true">·</span>
            <a href="#moments" className="hover:text-[#1F1518] transition-colors py-1">
              Camera Roll
            </a>
            <span aria-hidden="true">·</span>
            <a href="#letter" className="hover:text-[#1F1518] transition-colors py-1">
              Love Letter
            </a>
          </div>
        </div>
      </footer>

      <PhotoLightboxModal
        photos={MEMORY_PHOTOS}
        selectedPhoto={selectedPhoto}
        kissCount={state.kissCount}
        onClose={() => setSelectedPhoto(null)}
        onSelectPhoto={setSelectedPhoto}
        onSendKiss={handleSendKiss}
      />
    </div>
  );
}
