import { useState } from 'react';
import { Heart } from 'lucide-react';

interface ResilientPhotoProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
  containerClassName?: string;
}

export function ResilientPhoto({
  src,
  alt,
  fallbackTitle,
  className = 'object-cover object-center',
  containerClassName = '',
}: ResilientPhotoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F9EEF2] text-[#7A3B53] p-6 text-center ${containerClassName}`}
        role="img"
        aria-label={alt}
      >
        <Heart className="w-7 h-7 mb-2 text-[#D81B60]" aria-hidden="true" />
        <span className="font-editorial text-base font-medium">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#F6ECEF] ${containerClassName}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`w-full h-full transition-transform duration-500 ease-out ${className}`}
      />
    </div>
  );
}
