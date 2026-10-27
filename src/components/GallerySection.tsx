import { useState } from 'react';
import { motion } from 'motion/react';
import { MEMORY_PHOTOS, MemoryPhoto, PhotoCategory } from '../data/keepsakeData';
import { filterMemoriesByCategory } from '../utils/keepsakeLogic';
import { ResilientPhoto } from './ResilientPhoto';

interface GallerySectionProps {
  onSelectPhoto: (photo: MemoryPhoto) => void;
}

const FILTER_OPTIONS: { value: PhotoCategory; label: string }[] = [
  { value: 'all', label: 'All Frames (6)' },
  { value: 'her', label: 'Just Her (4)' },
  { value: 'us', label: 'Us Two (2)' },
];

export function GallerySection({ onSelectPhoto }: GallerySectionProps) {
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('all');

  const filteredPhotos = filterMemoriesByCategory(MEMORY_PHOTOS, activeCategory);

  return (
    <section id="moments" className="py-16 sm:py-20 lg:py-24 bg-[#FAF4F6] border-y border-[#EFE3E7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="max-w-xl">
            <p className="text-xs sm:text-sm font-medium text-[#8C5E6E] mb-2">
              <span>Chapter Two</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Favorite Frames</span>
            </p>
            <h2
              className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight text-[#1F1518] mb-2"
              style={{ textWrap: 'balance' }}
            >
              Snapshots of my favorite face—and us together.
            </h2>
            <p className="text-[15px] leading-relaxed text-[#574149]">
              Tap any photograph to open it full-screen and read what was going through my head.
            </p>
          </div>

          {/* Functional Segmented Filter Controls */}
          <div
            role="group"
            aria-label="Filter photographs"
            className="inline-flex items-center gap-1 p-1.5 bg-white rounded-xl border border-[#EADAE0] self-start md:self-auto"
          >
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeCategory === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActiveCategory(opt.value)}
                  aria-pressed={isActive}
                  className={`min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60] ${
                    isActive
                      ? 'bg-[#1F1518] text-white'
                      : 'text-[#6B535B] hover:text-[#1F1518] hover:bg-[#FAF3F6]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Media-First Bento / Editorial Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => onSelectPhoto(photo)}
                aria-label={`Open photo: ${photo.title}`}
                className="group w-full text-left bg-white rounded-2xl p-3.5 border border-[#ECDCE2] hover:border-[#D9B6C3] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
              >
                <div className="relative rounded-xl overflow-hidden aspect-[4/5] w-full mb-3.5">
                  <ResilientPhoto
                    src={photo.src}
                    alt={photo.alt}
                    fallbackTitle={photo.title}
                    className={`${photo.imageClass ?? 'object-cover object-center'} group-hover:scale-[1.03]`}
                    containerClassName="w-full h-full"
                  />
                  {/* Measured bottom contrast scrim on hover/mobile */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 via-black/25 to-transparent flex items-end justify-between px-3.5 pb-3">
                    <span className="text-xs font-medium text-white/95">{photo.season}</span>
                    <span className="text-xs font-semibold text-white underline underline-offset-2">
                      Open
                    </span>
                  </div>
                </div>

                <div className="px-1 pb-1">
                  <h3 className="font-editorial text-lg font-semibold text-[#1F1518] mb-1">
                    {photo.title}
                  </h3>
                  <p className="text-sm text-[#5B444C] line-clamp-2 leading-relaxed">
                    {photo.caption}
                  </p>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
