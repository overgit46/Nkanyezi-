import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';
import { MemoryPhoto } from '../data/keepsakeData';
import { getCyclicPhotoIndex } from '../utils/keepsakeLogic';
import { ResilientPhoto } from './ResilientPhoto';

interface PhotoLightboxModalProps {
  photos: MemoryPhoto[];
  selectedPhoto: MemoryPhoto | null;
  kissCount: number;
  onClose: () => void;
  onSelectPhoto: (photo: MemoryPhoto) => void;
  onSendKiss: () => void;
}

export function PhotoLightboxModal({
  photos,
  selectedPhoto,
  kissCount,
  onClose,
  onSelectPhoto,
  onSendKiss,
}: PhotoLightboxModalProps) {
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        const currentIdx = photos.findIndex((p) => p.id === selectedPhoto.id);
        const nextIdx = getCyclicPhotoIndex(currentIdx, 'next', photos.length);
        onSelectPhoto(photos[nextIdx]);
      } else if (event.key === 'ArrowLeft') {
        const currentIdx = photos.findIndex((p) => p.id === selectedPhoto.id);
        const prevIdx = getCyclicPhotoIndex(currentIdx, 'prev', photos.length);
        onSelectPhoto(photos[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, photos, onClose, onSelectPhoto]);

  if (!selectedPhoto) return null;

  const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);

  const handleNavigate = (direction: 'next' | 'prev') => {
    const targetIdx = getCyclicPhotoIndex(currentIndex, direction, photos.length);
    onSelectPhoto(photos[targetIdx]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-photo-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#FDFBF9] rounded-3xl border border-[#ECDCE2] overflow-hidden shadow-xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* High-resolution Media Column */}
          <div className="md:col-span-7 bg-[#160F12] relative aspect-[4/5] md:aspect-auto md:min-h-[480px]">
            <ResilientPhoto
              src={selectedPhoto.src}
              alt={selectedPhoto.alt}
              fallbackTitle={selectedPhoto.title}
              className={selectedPhoto.imageClass ?? 'object-cover object-center'}
              containerClassName="w-full h-full"
            />

            {/* Previous / Next Controls */}
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={() => handleNavigate('prev')}
                aria-label="Previous photograph"
                className="pointer-events-auto min-h-[44px] min-w-[44px] rounded-xl bg-black/65 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-black/65 text-white font-mono text-xs tabular-nums">
                {currentIndex + 1} / {photos.length}
              </span>

              <button
                type="button"
                onClick={() => handleNavigate('next')}
                aria-label="Next photograph"
                className="pointer-events-auto min-h-[44px] min-w-[44px] rounded-xl bg-black/65 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Caption & Affection Column */}
          <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-6">
                <p className="text-xs font-medium text-[#8C5E6E] pt-2">
                  <span>{selectedPhoto.season}</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>Nkanyezi</span>
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close photo viewer"
                  className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-xl bg-[#FAF1F4] hover:bg-[#F2DFE6] text-[#4F3B42] flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <h3
                id="lightbox-photo-title"
                className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1F1518] mb-4"
                style={{ textWrap: 'balance' }}
              >
                {selectedPhoto.title}
              </h3>

              <p className="text-[15px] leading-relaxed text-[#4F3B42] mb-6">
                {selectedPhoto.caption}
              </p>
            </div>

            <div className="pt-5 border-t border-[#EFE3E7] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onSendKiss}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D81B60] hover:bg-[#BE1250] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
              >
                <Heart className="w-4 h-4 fill-white" aria-hidden="true" />
                <span>Send Kiss</span>
                <span className="font-mono tabular-nums">({kissCount})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#6B535B] hover:text-[#1F1518] hover:bg-[#F7EEF1] transition-colors whitespace-nowrap shrink-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
