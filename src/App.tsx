/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Gamepad2, Sparkles } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/client';
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
import { GameArcadeShell } from './components/games/GameArcadeShell';
import { LiveRoomModal } from './components/games/LiveRoomModal';
import { ActiveGameKind, GameRoomDoc, subscribeToRoom } from './firebase/roomService';
import { validateFirestoreConnectionOnce } from './firebase/client';

const STORAGE_KEY = 'nkanyezi_keepsake_v1';

function parseUrlLaunchConfig(): {
  startInGames: boolean;
  initialGame: ActiveGameKind;
  autoStart: boolean;
} {
  if (typeof window === 'undefined') {
    return { startInGames: false, initialGame: 'cards', autoStart: false };
  }
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const gameParam = params.get('game');
  const autoStart = params.get('autostart') === '1';

  const initialGame: ActiveGameKind =
    gameParam === 'tictactoe' ||
    gameParam === 'cards' ||
    gameParam === 'celebrity' ||
    gameParam === 'snakes' ||
    gameParam === 'ludo' ||
    gameParam === 'connect4' ||
    gameParam === 'battleship' ||
    gameParam === 'mancala' ||
    gameParam === 'dots' ||
    gameParam === 'checkers' ||
    gameParam === 'memory' ||
    gameParam === 'wordduel'
      ? gameParam
      : 'connect4';

  return {
    startInGames: mode === 'games' || Boolean(gameParam),
    initialGame,
    autoStart,
  };
}

function loadInitialState(): KeepsakeState {
  if (typeof window === 'undefined') {
    return INITIAL_KEEPSAKE_STATE;
  }

  const params = new URLSearchParams(window.location.search);
  const autoUnseal = params.get('autostart') === '1' && params.get('mode') !== 'games';

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
  const [launch] = useState(parseUrlLaunchConfig);
  const [inGameMode, setInGameMode] = useState<boolean>(launch.startInGames);
  const [preferredGame, setPreferredGame] = useState<ActiveGameKind>(launch.initialGame);

  const [state, setState] = useState<KeepsakeState>(loadInitialState);
  const [selectedPhoto, setSelectedPhoto] = useState<MemoryPhoto | null>(null);

  // Shared 2-Phone Room State between Keepsake & Arcade Lounge
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<GameRoomDoc | null>(null);
  const [roomModalOpen, setRoomModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!roomCode || !user) {
      setRoom(null);
      return;
    }
    const unsub = subscribeToRoom(roomCode, (docData) => {
      setRoom(docData);
    });
    return () => unsub();
  }, [roomCode, user]);

  useEffect(() => {
    validateFirestoreConnectionOnce();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [state]);

  const handleOpenGames = (game: ActiveGameKind = 'cards') => {
    setPreferredGame(game);
    setInGameMode(true);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  if (inGameMode) {
    return (
      <GameArcadeShell
        initialGame={preferredGame}
        autoStart={launch.autoStart}
        onExitToKeepsake={() => setInGameMode(false)}
        sharedUser={user}
        sharedRoomCode={roomCode}
        sharedRoom={room}
        onSetRoomCode={setRoomCode}
        roomModalOpen={roomModalOpen}
        onSetRoomModalOpen={setRoomModalOpen}
      />
    );
  }

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
      <TopBar
        onOpenLetter={handleOpenAndScrollToLetter}
        onOpenGames={() => handleOpenGames('cards')}
        onOpenLiveRoom={() => setRoomModalOpen(true)}
        roomCode={roomCode}
      />

      <main className="flex-1">
        <HeroSection
          kissCount={state.kissCount}
          heartedCount={state.heartedQualityIds.length}
          onSendKiss={handleSendKiss}
          onOpenLetter={handleOpenAndScrollToLetter}
          onOpenGames={() => handleOpenGames('cards')}
          onSelectPhoto={setSelectedPhoto}
        />

        <MarqueeDivider />

        <QualitiesSection
          heartedIds={state.heartedQualityIds}
          onToggleHeart={handleToggleHeartQuality}
        />

        {/* Editorial Couple's Game Lounge Invitation Section */}
        <section id="games-invite" className="py-14 sm:py-20 bg-[#1B1116] text-[#FFF7FA]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#E4B2C4] mb-2">
                  Couple’s Game Mode · Live 2-Phone & Couch Play
                </p>
                <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold text-white">
                  Ready for a friendly rematch, Nkanyezi?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleOpenGames('cards')}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-sm font-semibold inline-flex items-center gap-2 self-start lg:self-auto whitespace-nowrap shrink-0 transition-colors"
              >
                <Gamepad2 className="w-4 h-4" aria-hidden="true" />
                <span>Enter Full-Screen Game Lounge</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="rounded-3xl bg-[#271820] border border-[#422A36] p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#34D399] font-medium mb-2">
                    100 Squares · Couple Milestones
                  </p>
                  <h3 className="font-editorial text-2xl font-semibold text-white mb-2">
                    Snakes & Ladders
                  </h3>
                  <p className="text-sm text-[#D6B8C4] leading-relaxed mb-6">
                    Zigzag across 100 tiles. Climb ladders for romantic perks, dodge playful snake
                    slides, roll again on 6, and bounce back if you overshoot tile 100!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenGames('snakes')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F3929] hover:bg-[#184F3B] border border-[#23684F] text-[#E8F8F0] text-xs font-semibold inline-flex items-center justify-between"
                >
                  <span>Climb & Roll Dice</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-3xl bg-[#271820] border border-[#422A36] p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#FDE68A] font-medium mb-2">
                    8 Safe Stars · Fast 2-Player Race
                  </p>
                  <h3 className="font-editorial text-2xl font-semibold text-white mb-2">
                    Couple’s Ludo
                  </h3>
                  <p className="text-sm text-[#D6B8C4] leading-relaxed mb-6">
                    Streamlined 2 tokens per player for snappy 5-minute matches. Roll a 6 to emerge
                    from yard, capture your partner’s token for a bonus roll, and race into Goal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenGames('ludo')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#3E1B2A] hover:bg-[#522438] border border-[#6B324D] text-[#FFF0F5] text-xs font-semibold inline-flex items-center justify-between"
                >
                  <span>Race to Goal</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#FDE68A]" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-3xl bg-[#271820] border border-[#422A36] p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#FDE68A] font-medium mb-2">
                    4-Player & 2-Player Modes
                  </p>
                  <h3 className="font-editorial text-2xl font-semibold text-white mb-2">
                    Crazy Eights & Card Lounge
                  </h3>
                  <p className="text-sm text-[#D6B8C4] leading-relaxed mb-6">
                    Play 4-player Crazy Eights, Action Switch (+2, Skip, Reverse), or Hearts Trump
                    with smart table bots or synced across both of our phones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenGames('cards')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#143829] hover:bg-[#1B4A36] border border-[#2C684F] text-[#E8F8F0] text-xs font-semibold inline-flex items-center justify-between"
                >
                  <span>Deal Crazy Eights</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#FDE68A]" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-3xl bg-[#271820] border border-[#422A36] p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#F9A8C6] font-medium mb-2">
                    48 Stars · Secret Role Swap
                  </p>
                  <h3 className="font-editorial text-2xl font-semibold text-white mb-2">
                    Guess the Celebrity Cards
                  </h3>
                  <p className="text-sm text-[#D6B8C4] leading-relaxed mb-6">
                    One of us sees the secret celebrity card while the other asks yes/no questions
                    to guess. As soon as you win or give up, we automatically switch roles!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenGames('celebrity')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#3A222E] hover:bg-[#4B2C3C] border border-[#5D374A] text-white text-xs font-semibold inline-flex items-center justify-between"
                >
                  <span>Draw Celebrity Card</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#F9A8C6]" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-3xl bg-[#271820] border border-[#422A36] p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#E4B2C4] font-medium mb-2">
                    Zero-Draw Disappearing Mode
                  </p>
                  <h3 className="font-editorial text-2xl font-semibold text-white mb-2">
                    Tic-Tac-Toe Bolt & Classic
                  </h3>
                  <p className="text-sm text-[#D6B8C4] leading-relaxed mb-6">
                    Play classic 3×3 or Bolt 3-Piece mode where your 4th mark lifts your oldest
                    piece off the board so every round ends in a decisive winner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenGames('tictactoe')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#3A222E] hover:bg-[#4B2C3C] border border-[#5D374A] text-white text-xs font-semibold inline-flex items-center justify-between"
                >
                  <span>Play Tic-Tac-Toe</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#FDE68A]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

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
          user={user}
          room={room}
          onOpenLiveRoomModal={() => setRoomModalOpen(true)}
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
            <button
              type="button"
              onClick={() => handleOpenGames('cards')}
              className="hover:text-[#D81B60] transition-colors py-1 cursor-pointer"
            >
              Game Lounge
            </button>
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

      {/* Keepsake 2-Phone Room Modal */}
      <LiveRoomModal
        open={roomModalOpen}
        user={user}
        room={room}
        activeGame="cards"
        onClose={() => setRoomModalOpen(false)}
        onConnectedRoom={(code) => {
          setRoomCode(code);
          setRoomModalOpen(false);
        }}
        onDisconnectRoom={() => {
          setRoomCode(null);
          setRoom(null);
          setRoomModalOpen(false);
        }}
      />
    </div>
  );
}
