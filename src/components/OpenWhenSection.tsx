import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, MailOpen } from 'lucide-react';
import { MEMORY_PHOTOS, OPEN_WHEN_ENVELOPES } from '../data/keepsakeData';
import { ResilientPhoto } from './ResilientPhoto';

export function OpenWhenSection() {
  const [selectedId, setSelectedId] = useState<string>(OPEN_WHEN_ENVELOPES[0].id);

  const activeEnvelope =
    OPEN_WHEN_ENVELOPES.find((env) => env.id === selectedId) ?? OPEN_WHEN_ENVELOPES[0];
  const matchedPhoto =
    MEMORY_PHOTOS.find((p) => p.id === activeEnvelope.photoId) ?? MEMORY_PHOTOS[0];

  return (
    <section id="open-when" className="py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#8C5E6E] mb-2">
            <span>Chapter Three</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Pocket Reminders</span>
          </p>
          <h2
            className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight text-[#1F1518] mb-3"
            style={{ textWrap: 'balance' }}
          >
            Little notes to open whenever you want to hear my voice.
          </h2>
          <p className="text-[15px] leading-relaxed text-[#574149]">
            Pick the moment you are in right now to unfold the envelope I wrote for it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Interactive Envelope Selector List */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {OPEN_WHEN_ENVELOPES.map((env) => {
              const isSelected = env.id === activeEnvelope.id;
              return (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => setSelectedId(env.id)}
                  aria-pressed={isSelected}
                  className={`w-full min-h-[64px] p-4 sm:p-5 rounded-2xl border text-left flex items-center gap-4 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60] ${
                    isSelected
                      ? 'bg-[#1F1518] border-[#1F1518] text-white shadow-sm'
                      : 'bg-white border-[#ECDCE2] text-[#1F1518] hover:border-[#D9B6C3] hover:bg-[#FCF7F9]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                      isSelected ? 'bg-[#D81B60] text-white' : 'bg-[#FAF0F4] text-[#9B3B5E]'
                    }`}
                  >
                    {isSelected ? (
                      <MailOpen className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Mail className="w-5 h-5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs mb-0.5 ${
                        isSelected ? 'text-[#F3C5D6]' : 'text-[#8C6573]'
                      }`}
                    >
                      {env.moodLabel}
                    </p>
                    <p className="font-semibold text-sm sm:text-[15px] leading-snug">
                      {env.prompt}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Unfolded Pocket Card */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeEnvelope.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECDCE2] grid grid-cols-1 sm:grid-cols-12 gap-6 items-center"
              >
                <div className="sm:col-span-5">
                  <div className="rounded-2xl overflow-hidden aspect-[4/5] w-full">
                    <ResilientPhoto
                      src={matchedPhoto.src}
                      alt={matchedPhoto.alt}
                      fallbackTitle={matchedPhoto.title}
                      className={matchedPhoto.imageClass}
                      containerClassName="w-full h-full"
                    />
                  </div>
                </div>

                <div className="sm:col-span-7">
                  <p className="text-xs font-medium text-[#8C5E6E] mb-2">
                    <span>{activeEnvelope.moodLabel}</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>Nkanyezi</span>
                  </p>
                  <h3
                    className="font-editorial text-2xl sm:text-[1.7rem] font-semibold text-[#1F1518] leading-snug mb-4"
                    style={{ textWrap: 'balance' }}
                  >
                    {activeEnvelope.heading}
                  </h3>
                  <p className="text-[15px] leading-[1.7] text-[#4F3B42] mb-5">
                    {activeEnvelope.message}
                  </p>
                  <p className="font-editorial italic text-sm text-[#8C435E]">
                    Always in your corner, always listening.
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
