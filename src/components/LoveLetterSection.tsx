import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, MailOpen, Send, Trash2 } from 'lucide-react';
import { DATE_VOUCHERS, LOVE_LETTER_PARAGRAPHS } from '../data/keepsakeData';
import { SavedReplyNote, validateReplyNote } from '../utils/keepsakeLogic';

interface LoveLetterSectionProps {
  letterUnsealed: boolean;
  onToggleLetter: (open: boolean) => void;
  claimedVoucherId: string | null;
  onClaimVoucher: (voucherId: string) => void;
  savedNotes: SavedReplyNote[];
  onAddNote: (message: string, mood: string) => void;
  onDeleteNote: (noteId: string) => void;
}

const MOOD_CHOICES = ['Blushing', 'Feeling Loved', 'Missing You', 'Ready For Our Date'];

export function LoveLetterSection({
  letterUnsealed,
  onToggleLetter,
  claimedVoucherId,
  onClaimVoucher,
  savedNotes,
  onAddNote,
  onDeleteNote,
}: LoveLetterSectionProps) {
  const [noteInput, setNoteInput] = useState('');
  const [selectedMood, setSelectedMood] = useState(MOOD_CHOICES[0]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const claimedVoucher = DATE_VOUCHERS.find((v) => v.id === claimedVoucherId) ?? null;

  const handleSubmitNote = (e: FormEvent) => {
    e.preventDefault();
    const result = validateReplyNote(noteInput);
    if (!result.valid || !result.cleanedMessage) {
      setValidationError(result.error ?? 'Please write a short note first.');
      return;
    }
    setValidationError(null);
    onAddNote(result.cleanedMessage, selectedMood);
    setNoteInput('');
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-[#FAF4F6] border-t border-[#EFE3E7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20">
        {/* Part 1: Interactive Wax-Sealed Letter */}
        <div id="letter" className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs sm:text-sm font-medium text-[#8C5E6E] mb-2">
              <span>Chapter Four</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Personal Letter</span>
            </p>
            <h2
              className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight text-[#1F1518]"
              style={{ textWrap: 'balance' }}
            >
              A letter sealed for Nkanyezi.
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#ECDCE2] shadow-sm">
            {!letterUnsealed ? (
              <div className="py-8 sm:py-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[#FCE7F0] border border-[#F5C6DA] flex items-center justify-center mb-5 text-[#D81B60]">
                  <Heart className="w-7 h-7 fill-[#D81B60]" aria-hidden="true" />
                </div>
                <p className="font-editorial text-2xl font-semibold text-[#1F1518] mb-2">
                  For Nkanyezi’s Eyes Only
                </p>
                <p className="text-sm sm:text-[15px] text-[#5B444C] max-w-md mb-7 leading-relaxed">
                  Written from the heart—no templates, no corporate polish, just everything you mean
                  to me.
                </p>
                <button
                  type="button"
                  onClick={() => onToggleLetter(true)}
                  className="min-h-[48px] px-7 py-3 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-sm font-semibold inline-flex items-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
                >
                  <MailOpen className="w-4 h-4" aria-hidden="true" />
                  <span>Break the Seal & Read</span>
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="unsealed-letter"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center justify-between gap-4 pb-6 mb-6 border-b border-[#F2E5EA]">
                    <div className="text-xs font-medium text-[#8C6573]">
                      <span>Dedicated to Nkanyezi</span>
                      <span className="mx-2" aria-hidden="true">·</span>
                      <span>With all my love</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleLetter(false)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#7D1941] hover:bg-[#FAF0F4] transition-colors whitespace-nowrap shrink-0"
                    >
                      Fold Envelope
                    </button>
                  </div>

                  <div className="space-y-5 text-[15px] sm:text-base leading-[1.8] text-[#35242B]">
                    {LOVE_LETTER_PARAGRAPHS.map((paragraph, idx) => (
                      <p
                        key={idx}
                        className={
                          idx === 0
                            ? 'font-editorial italic text-2xl text-[#1F1518] font-medium'
                            : ''
                        }
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#F2E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-editorial italic text-lg text-[#1F1518]">
                        Yours, always —
                      </p>
                      <p className="text-xs text-[#8C6573]">
                        Your boyfriend (and personal software engineer)
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Part 2: Interactive Date Night Voucher + Her Pocket Note */}
        <div
          id="date-vouchers"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-4"
        >
          {/* Left: Pick Our Next Date */}
          <div className="lg:col-span-6">
            <p className="text-xs sm:text-sm font-medium text-[#8C5E6E] mb-2">
              <span>Your Choice</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Redeem Anytime</span>
            </p>
            <h3
              className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1F1518] mb-3"
              style={{ textWrap: 'balance' }}
            >
              Pick our next date—my treat.
            </h3>
            <p className="text-sm sm:text-[15px] text-[#574149] mb-6 leading-relaxed">
              Tap the vibe you are in the mood for next, screenshot your claimed pass, and send it
              to me.
            </p>

            <div className="space-y-3.5">
              {DATE_VOUCHERS.map((voucher) => {
                const isClaimed = claimedVoucherId === voucher.id;
                return (
                  <button
                    key={voucher.id}
                    type="button"
                    onClick={() => onClaimVoucher(voucher.id)}
                    aria-pressed={isClaimed}
                    className={`w-full p-5 rounded-2xl border text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60] ${
                      isClaimed
                        ? 'bg-white border-[#D81B60] ring-1 ring-[#D81B60]'
                        : 'bg-white border-[#ECDCE2] hover:border-[#D5B0BF]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <p className="text-xs text-[#8C6573] mb-0.5">{voucher.vibe}</p>
                        <h4 className="font-editorial text-lg font-semibold text-[#1F1518]">
                          {voucher.title}
                        </h4>
                      </div>
                      <span
                        className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          isClaimed
                            ? 'bg-[#D81B60] text-white'
                            : 'bg-[#FAF0F4] text-[#7D1941]'
                        }`}
                      >
                        {isClaimed && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        <span>{isClaimed ? 'Claimed' : 'Claim Date'}</span>
                      </span>
                    </div>
                    <p className="text-sm text-[#574149] leading-relaxed">{voucher.description}</p>
                  </button>
                );
              })}
            </div>

            {claimedVoucher && (
              <div
                role="status"
                className="mt-4 p-4 rounded-2xl bg-[#FDF0F5] border border-[#F3C9DA] text-sm text-[#6E173B]"
              >
                <span className="font-semibold">Saved for Nkanyezi:</span>{' '}
                <span>{claimedVoucher.title} is officially locked in. Screenshot & text me!</span>
              </div>
            )}
          </div>

          {/* Right: Leave a Little Keepsake Reply */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-[#ECDCE2]">
            <p className="text-xs sm:text-sm font-medium text-[#8C5E6E] mb-2">
              <span>Keepsake Box</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Saved on Your Phone</span>
            </p>
            <h3
              className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1F1518] mb-2"
              style={{ textWrap: 'balance' }}
            >
              Leave a little note or reaction.
            </h3>
            <p className="text-sm text-[#574149] mb-5 leading-relaxed">
              Jot down how you are feeling right now—your notes stay tucked inside this page
              whenever you visit.
            </p>

            <form onSubmit={handleSubmitNote} noValidate className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-[#5B444C] mb-2">
                  Current mood
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Choose current mood">
                  {MOOD_CHOICES.map((mood) => {
                    const active = selectedMood === mood;
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setSelectedMood(mood)}
                        aria-pressed={active}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#1F1518] text-white'
                            : 'bg-[#FAF2F5] text-[#6B535B] hover:text-[#1F1518]'
                        }`}
                      >
                        {mood}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="pocket-note-input"
                  className="block text-xs font-semibold text-[#5B444C] mb-2"
                >
                  Your note
                </label>
                <textarea
                  id="pocket-note-input"
                  rows={3}
                  value={noteInput}
                  onChange={(e) => {
                    setNoteInput(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Write whatever is on your heart..."
                  className="w-full rounded-xl border border-[#DFC9D1] bg-[#FDFBF9] px-4 py-3 text-sm text-[#1F1518] placeholder:text-[#9D828B] focus:border-[#D81B60] focus:outline-none"
                />
                {validationError && (
                  <p role="alert" className="mt-2 text-xs font-medium text-[#BE123C]">
                    {validationError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-sm font-semibold inline-flex items-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Save Pocket Note</span>
              </button>
            </form>

            {/* Saved Notes List */}
            <div className="mt-7 pt-6 border-t border-[#F2E5EA]">
              <p className="text-xs font-semibold text-[#7A5965] mb-3">
                Saved Notes ({savedNotes.length})
              </p>

              {savedNotes.length === 0 ? (
                <p className="text-sm text-[#8C6573] italic">
                  No pocket notes saved yet—write the very first one above.
                </p>
              ) : (
                <ul className="space-y-3">
                  {savedNotes.map((note) => (
                    <li
                      key={note.id}
                      className="p-4 rounded-xl bg-[#FAF4F6] flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[#8C5E6E] mb-1">
                          <span>{note.mood}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>{note.createdAtLabel}</span>
                        </p>
                        <p className="text-sm text-[#2D1D23] leading-relaxed break-words">
                          {note.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label={`Delete note '${note.message.slice(0, 24)}'`}
                        className="min-h-[40px] min-w-[40px] -mr-1 -mt-1 rounded-lg text-[#9B7885] hover:text-[#BE123C] hover:bg-white flex items-center justify-center transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
