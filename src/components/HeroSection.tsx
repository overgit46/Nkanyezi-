import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Heart, Maximize2, Shuffle } from 'lucide-react';
import { MEMORY_PHOTOS, MemoryPhoto } from '../data/keepsakeData';
import { ResilientPhoto } from './ResilientPhoto';

interface HeroSectionProps {
  kissCount: number;
  heartedCount: number;
  onSendKiss: () => void;
  onOpenLetter: () => void;
  onSelectPhoto: (photo: MemoryPhoto) => void;
}

interface FloatingHeart {
  id: number;
  offsetX: number;
}

export function HeroSection({
  kissCount,
  heartedCount,
  onSendKiss,
  onOpenLetter,
  onSelectPhoto,
}: HeroSectionProps) {
  const [deckIndex, setDeckIndex] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  const activePhoto = MEMORY_PHOTOS[deckIndex];
  const nextPhoto = MEMORY_PHOTOS[(deckIndex + 1) % MEMORY_PHOTOS.length];

  const handleKissTrigger = () => {
    onSendKiss();
    const id = Date.now() + Math.random();
    const offsetX = Math.round((Math.random() - 0.5) * 44);
    setFloatingHearts((prev) => [...prev.slice(-5), { id, offsetX }]);
    window.setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((item) => item.id !== id));
    }, 900);
  };

  const handleShuffleDeck = () => {
    setDeckIndex((prev) => (prev + 1) % MEMORY_PHOTOS.length);
  };

  return (
    <section id="top" className="pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-8 lg:gap-12">
          {/* Left Typographic Column */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs sm:text-sm font-medium text-[#8C5E6E] mb-3">
              <span>Made exclusively for you</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Nkanyezi yami</span>
            </p>

            <h1
              className="font-editorial text-[2.35rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-[#1F1518] mb-5"
              style={{ textWrap: 'balance' }}
            >
              Not built for a client or an empire—built just for{' '}
              <span className="italic font-normal text-[#D81B60]">Nkanyezi</span>.
            </h1>

            <p className="text-[15px] sm:text-base leading-[1.68] text-[#4F3B42] max-w-[62ch] mb-7">
              I spend every week designing interfaces for companies and strangers, so I figured it
              was finally time to use one of the best perks of dating a software developer: making a
              little corner of the world dedicated entirely to your honesty, your brilliant mind,
              your gentle heart, and how effortless it feels to love you.
            </p>

            {/* Interactive Primary & Playful Secondary Actions */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
              <button
                type="button"
                onClick={onOpenLetter}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#D81B60] text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#BE1250] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
              >
                <span>Unseal Your Letter</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={handleKissTrigger}
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-[#F9EDF1] hover:bg-[#F3DFE6] border border-[#EBCFD9] text-[#7D1941] text-sm font-semibold inline-flex items-center gap-2 active:scale-[0.97] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
                >
                  <Heart className="w-4 h-4 fill-[#D81B60] text-[#D81B60]" aria-hidden="true" />
                  <span>Send a Kiss</span>
                  <span className="font-mono text-xs tabular-nums text-[#9B3B5E]">
                    ({kissCount})
                  </span>
                </button>

                {/* Compositor-only floating heart micro-animations */}
                <AnimatePresence>
                  {floatingHearts.map((item) => (
                    <motion.span
                      key={item.id}
                      initial={{ opacity: 0.95, y: 0, x: item.offsetX, scale: 0.8 }}
                      animate={{ opacity: 0, y: -56, x: item.offsetX, scale: 1.25 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                      className="pointer-events-none absolute left-1/2 -top-2 text-[#D81B60]"
                      aria-hidden="true"
                    >
                      <Heart className="w-4 h-4 fill-[#D81B60]" />
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile quick jump strip for thumb-friendly section access */}
            <div className="flex md:hidden items-center gap-4 text-xs font-medium text-[#7B5B66] pt-2 border-t border-[#F0E4E8]">
              <a href="#reasons" className="min-h-[44px] inline-flex items-center whitespace-nowrap">
                Why It’s You
              </a>
              <span aria-hidden="true">·</span>
              <a href="#moments" className="min-h-[44px] inline-flex items-center whitespace-nowrap">
                Camera Roll
              </a>
              <span aria-hidden="true">·</span>
              <a href="#open-when" className="min-h-[44px] inline-flex items-center whitespace-nowrap">
                Open When
              </a>
            </div>
          </div>

          {/* Right Interactive Polaroid-Editorial Deck */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="relative mx-auto w-full max-w-[400px] lg:max-w-none flex-1 flex flex-col">
              {/* Subtle rotated background preview card */}
              <div
                aria-hidden="true"
                className="absolute inset-x-3 top-3 bottom-3 rounded-3xl bg-[#F6E9EE] border border-[#EAD5DD] rotate-[2.5deg] transition-transform duration-300"
              >
                <div className="w-full h-full opacity-35 rounded-3xl overflow-hidden">
                  <ResilientPhoto
                    src={nextPhoto.src}
                    alt=""
                    fallbackTitle={nextPhoto.title}
                    className={nextPhoto.imageClass}
                    containerClassName="w-full h-full"
                  />
                </div>
              </div>

              {/* Active Photo Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePhoto.id}
                  initial={{ opacity: 0, scale: 0.97, rotate: -1.5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.97, rotate: 1.5 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 bg-white rounded-3xl p-4 sm:p-5 border border-[#ECDCE2] shadow-sm flex flex-col flex-1"
                >
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/5] w-full mb-4">
                    <ResilientPhoto
                      src={activePhoto.src}
                      alt={activePhoto.alt}
                      fallbackTitle={activePhoto.title}
                      className={activePhoto.imageClass}
                      containerClassName="w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => onSelectPhoto(activePhoto)}
                      aria-label={`View full photo: ${activePhoto.title}`}
                      className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-xl bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <Maximize2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-auto">
                    <div className="min-w-0">
                      <p className="text-xs text-[#8C6573] truncate">{activePhoto.season}</p>
                      <h2 className="font-editorial text-lg font-semibold text-[#1F1518] truncate">
                        {activePhoto.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={handleShuffleDeck}
                      aria-label="Shuffle to next photo in deck"
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF1F4] hover:bg-[#F3E1E8] text-[#7D1941] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
                    >
                      <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Next Frame</span>
                      <span className="font-mono tabular-nums text-[#9B3B5E]">
                        {deckIndex + 1}/{MEMORY_PHOTOS.length}
                      </span>
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Full-Width Editorial Summary Row Below Hero Split */}
        <div className="mt-12 pt-8 border-t border-[#EFE3E7] grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <p className="text-xs text-[#8C6573] mb-1">Dedicated To</p>
            <p className="font-editorial text-xl sm:text-2xl font-semibold text-[#1F1518]">
              Nkanyezi
            </p>
          </div>
          <div>
            <p className="text-xs text-[#8C6573] mb-1">Favorite Frames Saved</p>
            <p className="font-editorial text-xl sm:text-2xl font-semibold text-[#1F1518] tabular-nums">
              06 Moments
            </p>
          </div>
          <div>
            <p className="text-xs text-[#8C6573] mb-1">Qualities Hearted</p>
            <p className="font-editorial text-xl sm:text-2xl font-semibold text-[#1F1518] tabular-nums">
              {String(heartedCount).padStart(2, '0')} of 06
            </p>
          </div>
          <div>
            <p className="text-xs text-[#8C6573] mb-1">Audience Size</p>
            <p className="font-editorial text-xl sm:text-2xl font-semibold text-[#1F1518]">
              Just One Girl
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
