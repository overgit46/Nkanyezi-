import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Heart } from 'lucide-react';
import { ADORED_QUALITIES } from '../data/keepsakeData';

interface QualitiesSectionProps {
  heartedIds: string[];
  onToggleHeart: (qualityId: string) => void;
}

export function QualitiesSection({ heartedIds, onToggleHeart }: QualitiesSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>('honesty');

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="reasons" className="py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10 sm:mb-14">
          <p className="text-xs sm:text-sm font-medium text-[#8C5E6E] mb-2">
            <span>Chapter One</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>What I Love About You</span>
          </p>
          <h2
            className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight text-[#1F1518] mb-3"
            style={{ textWrap: 'balance' }}
          >
            Every reason my heart feels at ease with you.
          </h2>
          <p className="text-[15px] sm:text-base leading-relaxed text-[#574149]">
            Tap any card to open a personal note, or tap the heart on the ones that make you smile
            most—your favorites stay saved right here on your phone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {ADORED_QUALITIES.map((quality) => {
            const isHearted = heartedIds.includes(quality.id);
            const isExpanded = expandedId === quality.id;

            return (
              <article
                key={quality.id}
                className="bg-white rounded-2xl p-6 border border-[#ECDCE2] flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="text-xs font-medium text-[#8C6573] flex items-center gap-2">
                      <span className="font-mono tabular-nums text-[#B05C79]">{quality.index}</span>
                      <span aria-hidden="true">·</span>
                      <span>{quality.kicker}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleHeart(quality.id)}
                      aria-label={
                        isHearted
                          ? `Remove heart from ${quality.title}`
                          : `Heart ${quality.title}`
                      }
                      aria-pressed={isHearted}
                      className={`min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-xl flex items-center justify-center transition-transform duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60] ${
                        isHearted
                          ? 'text-[#D81B60] bg-[#FDF0F5]'
                          : 'text-[#9E7B88] hover:text-[#D81B60] hover:bg-[#FAF3F6]'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isHearted ? 'fill-[#D81B60] scale-110' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <h3
                    className="font-editorial text-xl font-semibold text-[#1F1518] leading-snug mb-3"
                    style={{ textWrap: 'balance' }}
                  >
                    {quality.title}
                  </h3>

                  <p className="text-[15px] leading-relaxed text-[#574149] mb-4">
                    {quality.summary}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(quality.id)}
                    aria-expanded={isExpanded}
                    className="min-h-[44px] w-full pt-3 border-t border-[#F3E7EB] flex items-center justify-between text-xs font-semibold text-[#7D1941] hover:text-[#BE1250] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
                  >
                    <span>{isExpanded ? 'Hide Personal Note' : 'Read Personal Note'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="pt-3 text-sm leading-relaxed text-[#462F38] font-editorial italic"
                      >
                        “{quality.deeperNote}”
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
