import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  CELEBRITY_DECK,
  CelebrityCard,
  CelebrityCategory,
  CelebrityOutcome,
  computeSwappedRoles,
  drawNextCelebrity,
  getPlayerCelebrityView,
} from '../../games/celebrityLogic';
import {
  CelebritySecretDoc,
  GameRoomDoc,
  MAX_QA_LEN,
  startNewCelebrityRoundOnline,
  subscribeToSecretCard,
  updateRoomGameplay,
} from '../../firebase/roomService';
import { gameAudio } from '../../games/soundFx';

interface CelebrityGuessArenaProps {
  room: GameRoomDoc | null;
  currentUid: string | null;
  paused: boolean;
  restartNonce: number;
  onScoreChange: (youScore: number, partnerScore: number) => void;
  onMatchEnd: (headline: string, subline: string) => void;
}

const CATEGORIES: readonly CelebrityCategory[] = [
  'All',
  'SA Icons',
  'Music',
  'Film & TV',
  'Sports',
];

export function CelebrityGuessArena({
  room,
  currentUid,
  paused,
  restartNonce,
  onScoreChange,
}: CelebrityGuessArenaProps) {
  const isOnline = Boolean(room && currentUid);
  const isHost = Boolean(room && currentUid && room.hostUid === currentUid);

  const [selectedCategory, setSelectedCategory] = useState<CelebrityCategory>('All');
  const [seenIds, setSeenIds] = useState<string[]>([]);

  // Local Couch Mode state (when playing face-to-face without 2 phones)
  const [localCard, setLocalCard] = useState<CelebrityCard>(() =>
    drawNextCelebrity('All', [])
  );
  const [localClueGiver, setLocalClueGiver] = useState<'you' | 'nkanyezi'>('you');
  const [couchPeekOpen, setCouchPeekOpen] = useState<boolean>(false);
  const [localQuestionCount, setLocalQuestionCount] = useState<number>(0);
  const [localLastQA, setLocalLastQA] = useState<string>('');
  const [localOutcome, setLocalOutcome] = useState<CelebrityOutcome>('guessing');
  const [localScores, setLocalScores] = useState<{ you: number; nkanyezi: number }>({
    you: 0,
    nkanyezi: 0,
  });

  // Online secret document state (readable ONLY by clueGiverUid while guessing)
  const [onlineSecret, setOnlineSecret] = useState<CelebritySecretDoc | null>(null);
  const [questionDraft, setQuestionDraft] = useState('');
  const autoDealLockRef = useRef<string>('');

  const effectiveOnlineClueGiverUid =
    isOnline && room ? room.celeb.clueGiverUid || room.hostUid : '';
  const onlineViewerIsClueGiver = Boolean(
    isOnline && room && currentUid && effectiveOnlineClueGiverUid === currentUid
  );
  const canReadOnlineSecret = Boolean(
    isOnline &&
      room &&
      (onlineViewerIsClueGiver || room.celeb.outcome !== 'guessing')
  );

  useEffect(() => {
    if (!isOnline || !room) {
      setOnlineSecret(null);
      return;
    }
    const unsub = subscribeToSecretCard(
      room.roomCode,
      room.celeb.roundId,
      canReadOnlineSecret,
      (secret) => setOnlineSecret(secret)
    );
    return () => unsub();
  }, [isOnline, room?.roomCode, room?.celeb.roundId, canReadOnlineSecret]);

  // Whenever this client is the designated Clue-Giver and celeb.roundId is empty
  // (e.g., room switched to Celebrity tab or partner passed Clue-Giver role), deal secret card on THIS phone
  useEffect(() => {
    if (
      !isOnline ||
      !room ||
      !currentUid ||
      !onlineViewerIsClueGiver ||
      room.celeb.roundId !== '' ||
      room.celeb.outcome !== 'guessing'
    ) {
      return;
    }

    const dealKey = `${room.roomCode}:${room.roundNumber}:${currentUid}`;
    if (autoDealLockRef.current === dealKey) return;
    autoDealLockRef.current = dealKey;

    const requestedCat: CelebrityCategory = CATEGORIES.includes(
      room.celeb.category as CelebrityCategory
    )
      ? (room.celeb.category as CelebrityCategory)
      : selectedCategory;

    const freshCard = drawNextCelebrity(requestedCat, seenIds);
    setSeenIds((prev) => [...prev.slice(-35), freshCard.id]);

    startNewCelebrityRoundOnline({
      roomCode: room.roomCode,
      clueGiverUid: currentUid,
      nextRoundNumber: room.roundNumber,
      roomStatus: room.guestUid ? 'playing' : 'waiting',
      card: freshCard,
    }).catch(() => {
      autoDealLockRef.current = '';
    });
  }, [
    isOnline,
    room?.roomCode,
    room?.roundNumber,
    room?.celeb.roundId,
    room?.celeb.outcome,
    room?.celeb.category,
    room?.guestUid,
    currentUid,
    onlineViewerIsClueGiver,
  ]);

  // Sync scores to top HUD
  useEffect(() => {
    if (isOnline && room) {
      onScoreChange(
        isHost ? room.hostScore : room.guestScore,
        isHost ? room.guestScore : room.hostScore
      );
    } else {
      onScoreChange(localScores.you, localScores.nkanyezi);
    }
  }, [isOnline, isHost, room?.hostScore, room?.guestScore, localScores.you, localScores.nkanyezi]);

  // Handle Restart [R] from HUD
  useEffect(() => {
    if (restartNonce === 0) return;
    handleDrawFreshSkipSwap(selectedCategory);
  }, [restartNonce]);

  const activeSecretAsCard: CelebrityCard | null = isOnline
    ? onlineSecret
      ? {
          id: onlineSecret.celebrityId,
          name: onlineSecret.celebrityName,
          category: (onlineSecret.category as CelebrityCard['category']) || 'Music',
          hints: [
            onlineSecret.hints[0] || 'Global icon',
            onlineSecret.hints[1] || 'Household name',
            onlineSecret.hints[2] || 'Fan favorite',
          ],
        }
      : null
    : localCard;

  const view = isOnline && room
    ? getPlayerCelebrityView({
        viewerIsClueGiver: onlineViewerIsClueGiver,
        secretCard: activeSecretAsCard,
        publicCategory: room.celeb.category,
        revealedName: room.celeb.revealedName,
        questionCount: room.celeb.questionCount,
        outcome: room.celeb.outcome,
      })
    : getPlayerCelebrityView({
        viewerIsClueGiver: couchPeekOpen,
        secretCard: localCard,
        publicCategory: localCard.category,
        revealedName: localOutcome !== 'guessing' ? localCard.name : '',
        questionCount: localQuestionCount,
        outcome: localOutcome,
      });

  const clueGiverName = isOnline && room
    ? effectiveOnlineClueGiverUid === room.hostUid
      ? room.hostName || 'Host'
      : room.guestName || 'Nkanyezi'
    : localClueGiver === 'you'
      ? 'You'
      : 'Nkanyezi';

  const guesserName = isOnline && room
    ? effectiveOnlineClueGiverUid === room.hostUid
      ? room.guestName || 'Nkanyezi'
      : room.hostName || 'Host'
    : localClueGiver === 'you'
      ? 'Nkanyezi'
      : 'You';

  const activeQA = isOnline && room ? room.celeb.lastQA : localLastQA;

  const handleLogAnswer = async (badge: 'YES' | 'NO' | 'CLOSE!') => {
    if (paused || view.outcome !== 'guessing') return;
    gameAudio.playCardDraw();

    if (isOnline && room) {
      const nextCount = Math.min(99, room.celeb.questionCount + 1);
      const prefix = room.celeb.lastQA.includes('?')
        ? room.celeb.lastQA.split('→')[0].trim()
        : `Question #${nextCount}`;
      const formatted = `${prefix} → ${badge}`.slice(0, MAX_QA_LEN);
      await updateRoomGameplay(room.roomCode, {
        celeb: {
          ...room.celeb,
          questionCount: nextCount,
          lastQA: formatted,
        },
      });
      return;
    }

    const nextCount = localQuestionCount + 1;
    setLocalQuestionCount(nextCount);
    setLocalLastQA(`Question #${nextCount} → ${badge}`);
  };

  const handleSubmitQuestionText = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = questionDraft.trim();
    if (!trimmed || paused || view.outcome !== 'guessing') return;
    setQuestionDraft('');
    const cleanQ = trimmed.endsWith('?') ? trimmed : `${trimmed}?`;

    if (isOnline && room) {
      await updateRoomGameplay(room.roomCode, {
        celeb: {
          ...room.celeb,
          lastQA: cleanQ.slice(0, MAX_QA_LEN),
        },
      });
    } else {
      setLocalLastQA(cleanQ.slice(0, MAX_QA_LEN));
    }
  };

  const handleResolveRound = async (didWin: boolean) => {
    if (paused || view.outcome !== 'guessing') return;
    const outcome: CelebrityOutcome = didWin ? 'guessed' : 'gave_up';
    if (didWin) {
      gameAudio.playWinFanfare();
    } else {
      gameAudio.playSwapChime();
    }

    if (isOnline && room) {
      const revealed = onlineSecret?.celebrityName || room.celeb.revealedName || '';
      const guesserIsHost = effectiveOnlineClueGiverUid !== room.hostUid;
      await updateRoomGameplay(room.roomCode, {
        celeb: {
          ...room.celeb,
          outcome,
          revealedName: revealed,
        },
        hostScore: didWin && guesserIsHost ? room.hostScore + 1 : room.hostScore,
        guestScore: didWin && !guesserIsHost ? room.guestScore + 1 : room.guestScore,
        roomStatus: room.guestUid ? 'round_over' : 'waiting',
      });
      return;
    }

    setLocalOutcome(outcome);
    setCouchPeekOpen(true);
    if (didWin) {
      // Guesser earns the point!
      if (localClueGiver === 'you') {
        setLocalScores((prev) => ({ ...prev, nkanyezi: prev.nkanyezi + 1 }));
      } else {
        setLocalScores((prev) => ({ ...prev, you: prev.you + 1 }));
      }
    }
  };

  const handleNextCardAndSwapRoles = async () => {
    gameAudio.playSwapChime();

    if (isOnline && room && currentUid) {
      const { nextClueGiverUid } = computeSwappedRoles(
        effectiveOnlineClueGiverUid,
        room.hostUid,
        room.guestUid
      );
      const nextRound = room.roundNumber + 1;
      const nextStatus = room.guestUid ? 'playing' : 'waiting';

      if (nextClueGiverUid === currentUid) {
        const nextExclude = [...seenIds, activeSecretAsCard?.id || ''].filter(Boolean);
        const nextCard = drawNextCelebrity(selectedCategory, nextExclude);
        setSeenIds(nextExclude.slice(-35));
        await startNewCelebrityRoundOnline({
          roomCode: room.roomCode,
          clueGiverUid: currentUid,
          nextRoundNumber: nextRound,
          roomStatus: nextStatus,
          card: nextCard,
        });
      } else {
        // Delegate secret card draw to the new Clue-Giver's phone so Guesser never generates or sees it
        await updateRoomGameplay(room.roomCode, {
          activeGame: 'celebrity',
          roomStatus: nextStatus,
          roundNumber: nextRound,
          celeb: {
            clueGiverUid: nextClueGiverUid,
            roundId: '',
            category: selectedCategory,
            questionCount: 0,
            lastQA: '',
            revealedName: '',
            outcome: 'guessing',
          },
        });
      }
      return;
    }

    const nextExclude = [...seenIds, activeSecretAsCard?.id || ''].filter(Boolean);
    const nextCard = drawNextCelebrity(selectedCategory, nextExclude);
    setSeenIds(nextExclude.slice(-35));
    setLocalClueGiver((prev) => (prev === 'you' ? 'nkanyezi' : 'you'));
    setLocalCard(nextCard);
    setCouchPeekOpen(false);
    setLocalQuestionCount(0);
    setLocalLastQA('');
    setLocalOutcome('guessing');
  };

  const handleDrawFreshSkipSwap = async (cat: CelebrityCategory) => {
    setSelectedCategory(cat);

    if (isOnline && room && currentUid) {
      const targetClueGiver = effectiveOnlineClueGiverUid;
      const nextRound = room.roundNumber + 1;
      const nextStatus = room.guestUid ? 'playing' : 'waiting';

      if (targetClueGiver === currentUid) {
        const nextCard = drawNextCelebrity(cat, seenIds);
        setSeenIds((prev) => [...prev.slice(-35), nextCard.id]);
        await startNewCelebrityRoundOnline({
          roomCode: room.roomCode,
          clueGiverUid: currentUid,
          nextRoundNumber: nextRound,
          roomStatus: nextStatus,
          card: nextCard,
        });
      } else {
        await updateRoomGameplay(room.roomCode, {
          activeGame: 'celebrity',
          roomStatus: nextStatus,
          roundNumber: nextRound,
          celeb: {
            clueGiverUid: targetClueGiver,
            roundId: '',
            category: cat,
            questionCount: 0,
            lastQA: '',
            revealedName: '',
            outcome: 'guessing',
          },
        });
      }
      return;
    }

    const nextCard = drawNextCelebrity(cat, seenIds);
    setSeenIds((prev) => [...prev.slice(-35), nextCard.id]);
    setLocalCard(nextCard);
    setCouchPeekOpen(false);
    setLocalQuestionCount(0);
    setLocalLastQA('');
    setLocalOutcome('guessing');
  };

  return (
    <div className="w-full h-full flex flex-col justify-between gap-3 px-3 sm:px-6 py-2 max-w-3xl mx-auto">
      {/* Category Deck Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#23171D] border border-[#3E2833] rounded-2xl p-2">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Celebrity deck category"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleDrawFreshSkipSwap(cat)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#D81B60] text-white'
                  : 'text-[#D6B8C4] hover:text-white hover:bg-[#312029]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-[#C9A3B2] px-2 tabular-nums">
          {CELEBRITY_DECK.length} Celebrity Cards
        </span>
      </div>

      {/* Role Assignment Strip */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-[#2A1B23] border border-[#4A303D] px-3.5 py-2.5">
          <p className="text-[11px] uppercase tracking-wider text-[#D4A7B8]">
            Sees the Celebrity
          </p>
          <p className="font-editorial text-lg font-semibold text-white truncate">
            {clueGiverName}
          </p>
        </div>
        <div className="rounded-2xl bg-[#2A1B23] border border-[#4A303D] px-3.5 py-2.5">
          <p className="text-[11px] uppercase tracking-wider text-[#FDE68A]">
            Asks Questions & Guesses
          </p>
          <p className="font-editorial text-lg font-semibold text-white truncate">
            {guesserName}
          </p>
        </div>
      </div>

      {/* Center Collectible Celebrity Card */}
      <div className="flex-1 flex flex-col items-center justify-center my-1">
        <div className="w-full max-w-md rounded-3xl bg-[#FFFDFB] text-[#1F1518] border-2 border-[#E6CBD4] shadow-2xl p-5 sm:p-6 flex flex-col justify-between min-h-[250px]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C5E6E] border-b border-[#F1E4E8] pb-3">
            <span>Category · {view.category}</span>
            <span className="font-mono tabular-nums">
              Questions: {view.questionCount}
            </span>
          </div>

          {view.canSeeSecret ? (
            <div className="my-4 text-center">
              <p className="text-xs uppercase tracking-widest text-[#D81B60] font-semibold mb-1">
                {view.outcome === 'guessed'
                  ? `${guesserName} Guessed Right!`
                  : view.outcome === 'gave_up'
                    ? 'Card Revealed'
                    : clueGiverName === 'You'
                      ? 'Secret Card — For Your Eyes Only!'
                      : `Secret Card — Only ${clueGiverName} Peeks!`}
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1F1518] mb-4">
                {view.displayName}
              </h2>

              {view.hints.length > 0 && (
                <ul className="text-left space-y-1.5 bg-[#FAF2F5] rounded-2xl p-3.5 border border-[#EEDCE3]">
                  {view.hints.map((hint, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-[#4F3B42] flex items-start gap-2">
                      <span className="font-bold text-[#D81B60] tabular-nums">{idx + 1}.</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              )}

              {!isOnline && view.outcome === 'guessing' && (
                <button
                  type="button"
                  onClick={() => setCouchPeekOpen(false)}
                  className="mt-4 min-h-[42px] px-4 py-2 rounded-xl bg-[#26161E] hover:bg-[#38212C] text-white text-xs font-semibold transition-colors"
                >
                  Hide Card Before Passing View to {guesserName}
                </button>
              )}
            </div>
          ) : (
            <div className="my-5 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-[#5A142B] text-[#F7C6D7] flex items-center justify-center mb-3 shadow-md">
                <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
                  <path
                    d="M16 3L19.6 12.4L29 16L19.6 19.6L16 29L12.4 19.6L3 16L12.4 12.4L16 3Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1F1518]">
                Hidden Celebrity Card
              </h2>
              <p className="text-xs sm:text-sm text-[#5C444D] mt-1.5 max-w-[34ch]">
                {isOnline
                  ? `${clueGiverName} can see this celebrity on their phone. Ask yes/no questions to narrow it down!`
                  : `${guesserName} looks away while ${clueGiverName} taps below to peek at the secret celebrity.`}
              </p>

              {!isOnline && (
                <button
                  type="button"
                  onClick={() => setCouchPeekOpen(true)}
                  className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                >
                  {clueGiverName}: Tap to Peek Secret Card
                </button>
              )}
            </div>
          )}

          {activeQA && (
            <div className="pt-2.5 border-t border-[#F1E4E8] text-xs font-medium text-[#6B4E58] flex items-center justify-between gap-2">
              <span className="truncate">Latest Clue: {activeQA}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Question Counter & Round Outcome Controls */}
      {view.outcome === 'guessing' ? (
        <div className="space-y-2.5">
          {isOnline && !onlineViewerIsClueGiver && (
            <form onSubmit={handleSubmitQuestionText} className="flex gap-2">
              <label htmlFor="celeb-question-input" className="sr-only">
                Ask a Yes or No question
              </label>
              <input
                id="celeb-question-input"
                type="text"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                placeholder="Type a Yes/No question (or ask out loud)..."
                maxLength={120}
                className="flex-1 min-h-[44px] rounded-xl bg-[#2A1B23] border border-[#4D3240] px-3.5 text-sm text-white placeholder:text-[#A98695] focus:outline-none focus:border-[#D81B60]"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#3D2733] hover:bg-[#4F3342] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Send Question
              </button>
            </form>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#23171D] border border-[#3E2833] rounded-2xl p-2.5">
            {/* Clue-giver quick answer buttons */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Answer question">
              <button
                type="button"
                onClick={() => handleLogAnswer('YES')}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#1E4635] hover:bg-[#265943] text-[#D7F5E8] text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Answer: Yes
              </button>
              <button
                type="button"
                onClick={() => handleLogAnswer('NO')}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#4A222E] hover:bg-[#5E2B3A] text-[#FAD1DD] text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Answer: No
              </button>
              <button
                type="button"
                onClick={() => handleLogAnswer('CLOSE!')}
                className="min-h-[42px] px-3 rounded-xl bg-[#47381D] hover:bg-[#5C4825] text-[#FDE68A] text-xs font-semibold whitespace-nowrap shrink-0"
              >
                So Close!
              </button>
            </div>

            {/* Outcome actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleResolveRound(true)}
                className="min-h-[42px] px-4 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0"
              >
                {guesserName} Got It! (+1)
              </button>
              <button
                type="button"
                onClick={() => handleResolveRound(false)}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#38252E] hover:bg-[#49303C] text-[#E6CAD5] text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Give Up · Reveal
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#23171D] border border-[#4D313F] rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">
              Ready to swap? Next round{' '}
              <span className="text-[#F9A8C6]">{guesserName}</span> sees the secret celebrity and{' '}
              <span className="text-[#FDE68A]">{clueGiverName}</span> guesses!
            </p>
          </div>
          <button
            type="button"
            onClick={handleNextCardAndSwapRoles}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-sm font-semibold whitespace-nowrap shrink-0 shadow-md"
          >
            Next Celebrity & Switch Roles
          </button>
        </div>
      )}
    </div>
  );
}
