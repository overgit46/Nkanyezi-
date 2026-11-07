import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../firebase/client';
import {
  ActiveGameKind,
  GameRoomDoc,
  subscribeToRoom,
  updateRoomGameplay,
} from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';
import { TicTacToeArena } from './TicTacToeArena';
import { CardLoungeTable } from './CardLoungeTable';
import { CelebrityGuessArena } from './CelebrityGuessArena';
import { SnakesArena } from './SnakesArena';
import { LudoArena } from './LudoArena';
import { LiveRoomModal } from './LiveRoomModal';
import { PlayingCardView } from './PlayingCardView';

export type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

interface GameArcadeShellProps {
  initialGame?: ActiveGameKind;
  autoStart?: boolean;
  onExitToKeepsake: () => void;
  sharedUser?: User | null;
  sharedRoomCode?: string | null;
  sharedRoom?: GameRoomDoc | null;
  onSetRoomCode?: (code: string | null) => void;
  roomModalOpen?: boolean;
  onSetRoomModalOpen?: (open: boolean) => void;
}

const GAME_CATALOG: readonly {
  id: ActiveGameKind;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'snakes',
    title: 'Snakes & Ladders',
    subtitle: '100 Squares · Couple Milestones & Slides',
  },
  {
    id: 'ludo',
    title: 'Couple’s Ludo',
    subtitle: 'Safe Stars · Fast 2-Player Race to Home',
  },
  {
    id: 'cards',
    title: 'Card Lounge · 4P',
    subtitle: 'Crazy Eights · Action Switch · Hearts Trump',
  },
  {
    id: 'celebrity',
    title: 'Guess the Celebrity',
    subtitle: '48 Stars · Secret Clue-Giver & Role Swap',
  },
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe Bolt',
    subtitle: '3-Piece Disappearing & Classic 3×3',
  },
];

export function GameArcadeShell({
  initialGame = 'cards',
  autoStart = false,
  onExitToKeepsake,
  sharedUser,
  sharedRoomCode,
  sharedRoom,
  onSetRoomCode,
  roomModalOpen: externalRoomModalOpen,
  onSetRoomModalOpen,
}: GameArcadeShellProps) {
  const [shellState, setShellState] = useState<ShellState>(
    autoStart ? 'playing' : 'title'
  );
  const [selectedGame, setSelectedGame] = useState<ActiveGameKind>(initialGame);
  const [muted, setMuted] = useState<boolean>(gameAudio.muted);
  const [restartNonce, setRestartNonce] = useState<number>(0);

  // Live Score Snapshot for HUD & Game-Over Modal
  const [scores, setScores] = useState<{ you: number; partner: number }>({
    you: 0,
    partner: 0,
  });

  const handleScoreChange = useCallback((you: number, partner: number) => {
    setScores((prev) => {
      if (prev.you === you && prev.partner === partner) return prev;
      return { you, partner };
    });
  }, []);
  const [matchSummary, setMatchSummary] = useState<{
    headline: string;
    subline: string;
  } | null>(null);

  // Local fallback auth & room if not shared by parent
  const [localUser, setLocalUser] = useState<User | null>(() => auth.currentUser);
  const [localRoomCode, setLocalRoomCode] = useState<string | null>(null);
  const [localRoom, setLocalRoom] = useState<GameRoomDoc | null>(null);
  const [localRoomModalOpen, setLocalRoomModalOpen] = useState<boolean>(false);

  const user = sharedUser !== undefined ? sharedUser : localUser;
  const roomCode = sharedRoomCode !== undefined ? sharedRoomCode : localRoomCode;
  const room = sharedRoom !== undefined ? sharedRoom : localRoom;
  const roomModalOpen =
    externalRoomModalOpen !== undefined ? externalRoomModalOpen : localRoomModalOpen;

  const setModalOpen = (open: boolean) => {
    if (onSetRoomModalOpen) {
      onSetRoomModalOpen(open);
    }
    setLocalRoomModalOpen(open);
  };

  useEffect(() => {
    if (sharedUser !== undefined) return;
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setLocalUser(nextUser);
    });
    return () => unsub();
  }, [sharedUser]);

  useEffect(() => {
    if (sharedRoom !== undefined) {
      if (sharedRoom && sharedRoom.activeGame !== selectedGame) {
        setSelectedGame(sharedRoom.activeGame);
      }
      return;
    }
    if (!localRoomCode || !user) {
      setLocalRoom(null);
      return;
    }
    const unsub = subscribeToRoom(localRoomCode, (docData) => {
      setLocalRoom(docData);
      if (docData && docData.activeGame !== selectedGame) {
        setSelectedGame(docData.activeGame);
      }
    });
    return () => unsub();
  }, [sharedRoom, localRoomCode, user, selectedGame]);

  // Mirror shellState to document.body.dataset.state per game_title_and_hud.md
  useEffect(() => {
    document.body.dataset.state = shellState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [shellState]);

  const handleStartPlaying = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setMatchSummary(null);
    setShellState('playing');
  };

  const handleToggleMute = () => {
    const next = !muted;
    gameAudio.muted = next;
    setMuted(next);
  };

  const handleRestartRound = () => {
    setMatchSummary(null);
    setRestartNonce((n) => n + 1);
    setShellState('playing');
  };

  const handleSelectGameTab = async (gameId: ActiveGameKind) => {
    setSelectedGame(gameId);
    setMatchSummary(null);
    if (room && user) {
      await updateRoomGameplay(room.roomCode, {
        activeGame: gameId,
        roomStatus: room.guestUid ? 'playing' : 'waiting',
      });
    }
  };

  // Global keyboard shortcuts: Enter/Space on Title, Escape/P for Pause, M for Mute, R for Restart
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping || roomModalOpen) return;

      if (shellState === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStartPlaying();
        return;
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (shellState === 'playing') {
          e.preventDefault();
          setShellState('paused');
        } else if (shellState === 'paused') {
          e.preventDefault();
          setShellState('playing');
        }
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.key.toLowerCase() === 'r' && shellState === 'playing') {
        e.preventDefault();
        handleRestartRound();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shellState, muted, roomModalOpen]);

  return (
    <div className="min-h-screen w-full bg-[#170F13] text-[#FFF7FA] flex flex-col justify-between select-none overflow-x-hidden">
      {shellState === 'title' ? (
        /* ================= PART I: GAME SHELL TITLE STAGE ================= */
        <main className="flex-1 flex flex-col justify-start lg:justify-between max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 gap-6">
          {/* Top Escape back to Keepsake + 2-Phone Room Trigger */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onExitToKeepsake}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#26181F] hover:bg-[#34212B] border border-[#422A36] text-xs sm:text-sm font-semibold text-[#F3DCE4] whitespace-nowrap shrink-0 transition-colors"
            >
              ← Back to Nkanyezi’s Keepsake
            </button>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#2A1B23] hover:bg-[#3A2530] border border-[#563646] text-xs sm:text-sm font-semibold text-[#FDE68A] whitespace-nowrap shrink-0 transition-colors"
            >
              {room ? `Live Room: ${room.roomCode}` : '2-Phone Live Room'}
            </button>
          </div>

          {/* Asymmetric Negative-Space Split: Left Custom <svg> Crest & Start CTA, Right Tactile Card/Board Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 my-auto py-6">
            <div className="lg:col-span-7 flex flex-col items-start">
              {/* Custom Inline <svg> Title Emblem Lockup */}
              <svg
                viewBox="0 0 380 86"
                className="w-full max-w-[340px] sm:max-w-[380px] h-auto mb-4"
                role="img"
                aria-label="Nkanyezi Arcade — Couple's Game Lounge"
              >
                <rect
                  x="2"
                  y="6"
                  width="68"
                  height="72"
                  rx="16"
                  fill="#2B1822"
                  stroke="#E5B2C5"
                  strokeWidth="2"
                />
                <path
                  d="M36 20L40.8 33.2L54 38L40.8 42.8L36 56L31.2 42.8L18 38L31.2 33.2L36 20Z"
                  fill="#FDE68A"
                />
                <path
                  d="M36 60C32 56.5 26 53 26 48.5C26 45.8 28.2 44 30.8 44C32.8 44 34.6 45.1 36 46.8C37.4 45.1 39.2 44 41.2 44C43.8 44 46 45.8 46 48.5C46 53 40 56.5 36 60Z"
                  fill="#D81B60"
                />
                <text
                  x="86"
                  y="42"
                  fill="#FFF7FA"
                  fontFamily="Cormorant Garamond, Georgia, serif"
                  fontSize="36"
                  fontWeight="700"
                >
                  Nkanyezi’s Lounge
                </text>
                <text
                  x="88"
                  y="66"
                  fill="#E0B6C6"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontSize="10.5"
                  fontWeight="600"
                  letterSpacing="1.6"
                >
                  SNAKES · LUDO · CARDS · CELEBRITY · TIC-TAC-TOE
                </text>
              </svg>

              {/* Interactive Game Picker Cards */}
              <div
                className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-6"
                role="radiogroup"
                aria-label="Choose a game to play"
              >
                {GAME_CATALOG.map((item) => {
                  const active = selectedGame === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelectedGame(item.id)}
                      className={`text-left p-3 rounded-2xl border transition-all ${
                        active
                          ? 'bg-[#321C27] border-[#D81B60] ring-2 ring-[#D81B60]/50'
                          : 'bg-[#21141B] border-[#3B2530] hover:border-[#5C3A4B]'
                      }`}
                    >
                      <p className="font-editorial text-base sm:text-lg font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#C9A3B2] mt-0.5 leading-snug">
                        {item.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Primary Start Handshake CTA (<= 3 actions total) */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-start="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleStartPlaying();
                  }}
                  className="min-h-[52px] px-8 py-3.5 rounded-2xl bg-[#D81B60] hover:bg-[#BE1250] active:scale-[0.98] text-white text-base font-semibold whitespace-nowrap shrink-0 shadow-lg transition-all"
                >
                  Start Playing Now
                </button>

                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="min-h-[52px] px-5 py-3.5 rounded-2xl bg-[#271820] hover:bg-[#35212C] border border-[#4B2F3E] text-[#F7DCE6] text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  {room ? `Connected (${room.roomCode})` : 'Connect Two Phones'}
                </button>
              </div>
            </div>

            {/* Right Interactive Centerpiece Showcase */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative w-full max-w-[360px] rounded-3xl bg-[#1D1219] border-4 border-[#3E242D] p-6 shadow-2xl flex flex-col items-center">
                {selectedGame === 'snakes' && (
                  <div className="flex flex-col items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center text-white font-black text-xl shadow-lg border border-[#34D399]/40">
                        🪜
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-[#2C1824] border-2 border-[#E5B2C5] flex items-center justify-center text-[#FDE68A] font-mono text-3xl font-black shadow-xl">
                        6
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#991B1B] flex items-center justify-center text-white font-black text-xl shadow-lg border border-[#F87171]/40">
                        🐍
                      </div>
                    </div>
                  </div>
                )}

                {selectedGame === 'ludo' && (
                  <div className="flex flex-col items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D81B60] to-[#FF80AB] ring-4 ring-[#D81B60]/40 flex items-center justify-center text-white font-bold text-sm shadow-xl">
                        N1
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center text-white text-lg font-black shadow-md">
                        ★
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] ring-4 ring-[#0284C7]/40 flex items-center justify-center text-white font-bold text-sm shadow-xl">
                        B1
                      </div>
                    </div>
                  </div>
                )}

                {(selectedGame === 'cards' || selectedGame === 'celebrity' || selectedGame === 'tictactoe') && (
                  <div className="flex items-center justify-center -space-x-3 mb-4">
                    <div className="-rotate-12 transition-transform hover:-translate-y-2">
                      <PlayingCardView code="8H" size="lg" playable />
                    </div>
                    <div className="z-10 -translate-y-2 transition-transform hover:-translate-y-4">
                      <PlayingCardView code="AS" size="lg" />
                    </div>
                    <div className="rotate-12 transition-transform hover:-translate-y-2">
                      <PlayingCardView faceDown size="lg" />
                    </div>
                  </div>
                )}

                <p className="font-editorial text-xl font-semibold text-[#FFF7FA] text-center">
                  {selectedGame === 'snakes'
                    ? '100-Square Couple Snakes & Ladders'
                    : selectedGame === 'ludo'
                      ? 'Safe Stars · Fast 2-Player Ludo'
                      : selectedGame === 'cards'
                        ? '4-Player Crazy Eights, Switch & Hearts'
                        : selectedGame === 'celebrity'
                          ? '48 Celebrity Cards · Secret Role Swap'
                          : 'Bolt 3-Piece & Classic Tic-Tac-Toe'}
                </p>
                <p className="text-xs text-[#DEC0CC] text-center mt-1">
                  {selectedGame === 'snakes'
                    ? 'Climb romantic ladders, slide down playful snakes, roll again on 6, exact bounce on 100.'
                    : selectedGame === 'ludo'
                      ? '2 tokens each for snappy ~5-min matches, 8 safe stars, bonus turns on 6 or capture.'
                      : 'Play instantly vs smart bots, pass-and-play on one phone, or sync live across both phones.'}
                </p>
              </div>
            </div>
          </div>

          {/* Flat Borderless Control Hint Line in Bottom Safe Margin */}
          <p className="text-center text-xs text-[#B58E9E] tracking-wide">
            Tap or Click · Enter Start · P Pause · R Restart · M Mute
          </p>
        </main>
      ) : (
        /* ================= PART II: UNIFIED PERIMETER HUD + ACTIVE ARENA ================= */
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#170F13]">
          {/* Single Unified Perimeter HUD Bar (1 row on sm+, clean 2-row dock on 390px mobile so zero tabs clip) */}
          <div
            role="region"
            aria-label="Game controls and score HUD"
            className="shrink-0 z-30 bg-[#21141B]/95 backdrop-blur-md border-b border-[#3D2632] px-3 sm:px-5 py-2 flex flex-col gap-2 shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              {/* Left: Lobby + Desktop Game Tabs */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShellState('title')}
                  aria-label="Return to game title screen"
                  className="min-h-[40px] px-3 rounded-xl bg-[#2E1C26] hover:bg-[#3D2532] text-xs font-semibold text-[#F3DCE4] whitespace-nowrap shrink-0"
                >
                  ← Lobby
                </button>
                <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                  {GAME_CATALOG.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectGameTab(g.id)}
                      className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        selectedGame === g.id
                          ? 'bg-[#D81B60] text-white'
                          : 'bg-[#2A1922] text-[#CDB0BC] hover:text-white'
                      }`}
                    >
                      {g.id === 'snakes'
                        ? 'Snakes & Ladders'
                        : g.id === 'ludo'
                          ? 'Ludo'
                          : g.id === 'cards'
                            ? 'Cards (4P)'
                            : g.id === 'celebrity'
                              ? 'Celebrity'
                              : 'Tic-Tac-Toe'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Center/Right: Hero-to-Kicker Tabular Score, Live Room Trigger & Utility Icons */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-[9px] uppercase tracking-widest text-[#C9A3B2]">
                    SCORE
                  </span>
                  <span className="font-mono text-base sm:text-xl font-bold tabular-nums text-[#FDE68A]">
                    {Math.round(scores.you)}:{Math.round(scores.partner)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-[#2D1C25] hover:bg-[#3D2632] border border-[#4E3140] text-xs font-semibold text-[#FDE68A] whitespace-nowrap shrink-0"
                >
                  {room ? room.roomCode : '2-Phone'}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleToggleMute();
                    }}
                    aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
                    className="w-10 h-10 rounded-xl bg-[#2D1C25] hover:bg-[#3E2733] border border-[#4A2F3D] flex items-center justify-center text-[#F5DCE6]"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                      {muted ? (
                        <path
                          d="M11 5L6 9H2V15H6L11 19V5ZM22 9L16 15M16 9L22 15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      ) : (
                        <path
                          d="M11 5L6 9H2V15H6L11 19V5ZM15.54 8.46C16.47 9.39 17 10.66 17 12C17 13.34 16.47 14.61 15.54 15.54M19.07 4.93C20.94 6.8 22 9.34 22 12C22 14.66 20.94 17.2 19.07 19.07"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      )}
                    </svg>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleRestartRound();
                    }}
                    aria-label="Restart round (R)"
                    className="w-10 h-10 rounded-xl bg-[#2D1C25] hover:bg-[#3E2733] border border-[#4A2F3D] flex items-center justify-center text-[#F5DCE6]"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                      <path
                        d="M3 12A9 9 0 1 0 6 5.3L3 8M3 3V8H8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setShellState((s) => (s === 'paused' ? 'playing' : 'paused'));
                    }}
                    aria-label="Pause game (P)"
                    className="w-10 h-10 rounded-xl bg-[#2D1C25] hover:bg-[#3E2733] border border-[#4A2F3D] flex items-center justify-center text-[#F5DCE6]"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile-only scrolling switcher row so zero tabs clip on narrow phones */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:hidden">
              {GAME_CATALOG.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelectGameTab(g.id)}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    selectedGame === g.id
                      ? 'bg-[#D81B60] text-white'
                      : 'bg-[#2A1922] text-[#CDB0BC] hover:text-white'
                  }`}
                >
                  {g.id === 'snakes'
                    ? 'Snakes'
                    : g.id === 'ludo'
                      ? 'Ludo'
                      : g.id === 'cards'
                        ? 'Cards'
                        : g.id === 'celebrity'
                          ? 'Celebrity'
                          : 'Tic-Tac-Toe'}
                </button>
              ))}
            </div>
          </div>

          {/* Unobstructed Active Playfield with full vertical scrolling */}
          <main className="flex-1 overflow-y-auto overscroll-contain flex flex-col items-center justify-start py-4 px-2 sm:px-6 pb-28">
            {selectedGame === 'snakes' && (
              <SnakesArena
                room={room}
                userUid={user?.uid ?? null}
                restartTrigger={restartNonce}
                onScoreUpdate={(s: { you: number; partner: number }) => handleScoreChange(s.you, s.partner)}
                onGameOver={(headline: string, subline: string) => {
                  setMatchSummary({ headline, subline });
                  setShellState('gameover');
                }}
              />
            )}

            {selectedGame === 'ludo' && (
              <LudoArena
                room={room}
                userUid={user?.uid ?? null}
                restartTrigger={restartNonce}
                onScoreUpdate={(s: { you: number; partner: number }) => handleScoreChange(s.you, s.partner)}
                onGameOver={(headline: string, subline: string) => {
                  setMatchSummary({ headline, subline });
                  setShellState('gameover');
                }}
              />
            )}

            {selectedGame === 'tictactoe' && (
              <TicTacToeArena
                room={room}
                currentUid={user?.uid ?? null}
                paused={shellState !== 'playing'}
                restartNonce={restartNonce}
                onScoreChange={handleScoreChange}
                onMatchEnd={(headline, subline) => {
                  setMatchSummary({ headline, subline });
                  setShellState('gameover');
                }}
              />
            )}

            {selectedGame === 'cards' && (
              <CardLoungeTable
                room={room}
                currentUid={user?.uid ?? null}
                paused={shellState !== 'playing'}
                restartNonce={restartNonce}
                onScoreChange={handleScoreChange}
                onMatchEnd={(headline, subline) => {
                  setMatchSummary({ headline, subline });
                  setShellState('gameover');
                }}
              />
            )}

            {selectedGame === 'celebrity' && (
              <CelebrityGuessArena
                room={room}
                currentUid={user?.uid ?? null}
                paused={shellState !== 'playing'}
                restartNonce={restartNonce}
                onScoreChange={handleScoreChange}
                onMatchEnd={(headline, subline) => {
                  setMatchSummary({ headline, subline });
                  setShellState('gameover');
                }}
              />
            )}
          </main>
        </div>
      )}

      {/* ================= SINGLE FOCUSED PAUSE MODAL ================= */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          className="fixed inset-0 z-40 bg-[#0F090C]/90 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#24161E] border-2 border-[#4F3241] p-6 text-center shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-[#E0B6C6]">
              Game Paused
            </p>
            <h2 className="font-editorial text-3xl font-semibold text-white mt-1 mb-4">
              Take Your Time
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl bg-[#1A0F15] p-3 border border-[#3B2530]">
                <p className="text-[10px] uppercase tracking-wider text-[#C9A3B2]">
                  Your Score
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums text-[#FDE68A]">
                  {Math.round(scores.you)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#1A0F15] p-3 border border-[#3B2530]">
                <p className="text-[10px] uppercase tracking-wider text-[#C9A3B2]">
                  Table / Partner
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums text-[#F9A8C6]">
                  {Math.round(scores.partner)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full min-h-[46px] rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-sm font-semibold"
              >
                Resume Game
              </button>
              <button
                type="button"
                onClick={handleRestartRound}
                className="w-full min-h-[44px] rounded-xl bg-[#33202A] hover:bg-[#432A37] text-[#F5DCE6] text-sm font-semibold"
              >
                Restart Round
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="w-full min-h-[44px] rounded-xl bg-[#2A1A23] hover:bg-[#38232E] text-[#D4B2C0] text-xs font-semibold"
              >
                Game Title Screen
              </button>
              <button
                type="button"
                onClick={onExitToKeepsake}
                className="w-full min-h-[42px] text-xs font-semibold text-[#C9A3B2] hover:text-white"
              >
                Exit to Nkanyezi’s Keepsake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SINGLE FOCUSED VICTORY / ROUND OVER MODAL ================= */}
      {shellState === 'gameover' && matchSummary && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Round Complete"
          className="fixed inset-0 z-40 bg-[#0F090C]/90 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#24161E] border-2 border-[#E6B8C7] p-6 text-center shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-[#FDE68A]">
              Round Complete
            </p>
            <h2 className="font-editorial text-3xl font-semibold text-white mt-1">
              {matchSummary.headline}
            </h2>
            <p className="text-xs sm:text-sm text-[#DEC0CC] mt-1.5 mb-5">
              {matchSummary.subline}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl bg-[#1A0F15] p-3 border border-[#3B2530]">
                <p className="text-[10px] uppercase tracking-wider text-[#C9A3B2]">
                  Your Wins
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums text-[#FDE68A]">
                  {Math.round(scores.you)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#1A0F15] p-3 border border-[#3B2530]">
                <p className="text-[10px] uppercase tracking-wider text-[#C9A3B2]">
                  Table / Partner
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums text-[#F9A8C6]">
                  {Math.round(scores.partner)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={handleRestartRound}
                className="w-full min-h-[48px] rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-sm font-semibold shadow-md"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="w-full min-h-[44px] rounded-xl bg-[#33202A] hover:bg-[#432A37] text-[#F5DCE6] text-xs font-semibold"
              >
                Switch Game Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Live Room Setup Modal */}
      <LiveRoomModal
        open={roomModalOpen}
        user={user}
        room={room}
        activeGame={selectedGame}
        onClose={() => setModalOpen(false)}
        onConnectedRoom={(code) => {
          if (onSetRoomCode) {
            onSetRoomCode(code);
          }
          setLocalRoomCode(code);
          setModalOpen(false);
          if (shellState === 'title') {
            handleStartPlaying();
          }
        }}
        onDisconnectRoom={() => {
          if (onSetRoomCode) {
            onSetRoomCode(null);
          }
          setLocalRoomCode(null);
          setLocalRoom(null);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
