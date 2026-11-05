import { FormEvent, useState } from 'react';
import { signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/client';
import {
  ActiveGameKind,
  createMultiplayerRoom,
  GameRoomDoc,
  joinMultiplayerRoom,
  normalizeRoomCode,
} from '../../firebase/roomService';

interface LiveRoomModalProps {
  open: boolean;
  user: User | null;
  room: GameRoomDoc | null;
  activeGame: ActiveGameKind;
  onClose: () => void;
  onConnectedRoom: (roomCode: string) => void;
  onDisconnectRoom: () => void;
}

export function LiveRoomModal({
  open,
  user,
  room,
  activeGame,
  onClose,
  onConnectedRoom,
  onDisconnectRoom,
}: LiveRoomModalProps) {
  const [displayName, setDisplayName] = useState<string>(
    () => user?.displayName?.split(' ')[0] || ''
  );
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (!displayName && cred.user.displayName) {
        setDisplayName(cred.user.displayName.split(' ')[0]);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Google Sign-In could not complete. Check popup permissions.'
      );
    } finally {
      setBusy(false);
    }
  };

  const formatModalError = (err: unknown, fallback: string): string => {
    if (!(err instanceof Error)) return fallback;
    const raw = err.message.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        if (typeof parsed.error === 'string' && parsed.error.length > 0) {
          return parsed.error;
        }
      } catch {
        // Use raw message if not JSON
      }
    }
    return raw || fallback;
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      const code = await createMultiplayerRoom(
        user.uid,
        displayName || user.displayName || 'You',
        activeGame
      );
      onConnectedRoom(code);
    } catch (err) {
      setErrorMessage(
        formatModalError(err, 'Unable to create room right now.')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoinRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleaned = normalizeRoomCode(joinCodeInput);
    if (cleaned.length < 4) {
      setErrorMessage('Enter the 6-character room code (for example NK4829).');
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      const code = await joinMultiplayerRoom(
        cleaned,
        user.uid,
        displayName || user.displayName || 'Nkanyezi'
      );
      onConnectedRoom(code);
    } catch (err) {
      setErrorMessage(formatModalError(err, 'Could not join room.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Two-Phone Live Room Setup"
      className="fixed inset-0 z-50 bg-[#0F090C]/90 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#22151C] border-2 border-[#4A2F3D] p-6 text-[#FFF7FA] shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#E6B0C4]">
              Firebase Live Sync
            </p>
            <h2 className="font-editorial text-2xl font-semibold text-white mt-0.5">
              Play Across Two Phones
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close live room dialog"
            className="min-h-[40px] px-3 rounded-xl bg-[#33202A] hover:bg-[#432A37] text-xs font-semibold text-[#E8CDD7]"
          >
            Done
          </button>
        </div>

        {!user ? (
          <div className="space-y-4">
            <p className="text-sm text-[#D7BAC5] leading-relaxed">
              Sign in with Google on both phones to sync moves in real time and keep
              Guess the Celebrity cards strictly private to whoever is giving clues.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[48px] rounded-xl bg-[#D81B60] hover:bg-[#BE1250] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {busy ? 'Connecting...' : 'Sign In with Google'}
            </button>
          </div>
        ) : room ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#180E13] border border-[#3E2733] p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-[#C9A3B2]">
                Room Code
              </p>
              <p className="font-mono text-3xl font-bold tracking-widest text-[#FDE68A] my-1.5">
                {room.roomCode}
              </p>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#34202B] hover:bg-[#472C3B] text-xs font-semibold text-white"
              >
                {copied ? 'Code Copied!' : 'Copy Room Code'}
              </button>
            </div>

            <div className="rounded-2xl bg-[#2B1B24] border border-[#442B38] p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#C9A3B2]">Seat 1 (Host):</span>
                <span className="font-semibold text-white">{room.hostName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C9A3B2]">Seat 2 (Partner):</span>
                <span className="font-semibold text-[#F9A8C6]">
                  {room.guestName || 'Waiting for Nkanyezi to join...'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={onDisconnectRoom}
                className="min-h-[44px] px-4 rounded-xl bg-[#38232E] hover:bg-[#4A2E3D] text-xs font-semibold text-[#E8CDD7]"
              >
                Leave Room (Local Mode)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-xs font-semibold text-white"
              >
                Back to Game
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="player-nickname-input"
                className="block text-xs font-semibold text-[#DEC0CC] mb-1.5"
              >
                Your Name at the Table
              </label>
              <input
                id="player-nickname-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. You or Nkanyezi"
                maxLength={32}
                className="w-full min-h-[44px] rounded-xl bg-[#180E13] border border-[#462D3A] px-3.5 text-sm text-white focus:outline-none focus:border-[#D81B60]"
              />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleCreateRoom}
              className="w-full min-h-[48px] rounded-xl bg-[#D81B60] hover:bg-[#BE1250] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {busy ? 'Creating Room...' : 'Create New 2-Phone Room'}
            </button>

            <div className="relative py-1 text-center text-xs text-[#9E7B89]">
              <span>or join with a code from the other phone</span>
            </div>

            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <label htmlFor="join-room-code-input" className="sr-only">
                6-character room code
              </label>
              <input
                id="join-room-code-input"
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="NK4829"
                maxLength={8}
                className="flex-1 min-h-[46px] rounded-xl bg-[#180E13] border border-[#462D3A] px-3.5 font-mono uppercase tracking-widest text-sm text-white focus:outline-none focus:border-[#D81B60]"
              />
              <button
                type="submit"
                disabled={busy}
                className="min-h-[46px] px-5 rounded-xl bg-[#F4D3DF] hover:bg-[#FFE3EE] text-[#23131A] text-sm font-semibold whitespace-nowrap shrink-0"
              >
                Join Room
              </button>
            </form>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="mt-3 text-xs text-[#FDA4AF] bg-[#3B1522] rounded-xl p-2.5">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
