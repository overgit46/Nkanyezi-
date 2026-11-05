import { CardCode, parseCard, SUIT_NAMES, SUIT_SYMBOLS } from '../../games/cardGamesLogic';

interface PlayingCardViewProps {
  code?: CardCode;
  faceDown?: boolean;
  playable?: boolean;
  selected?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<NonNullable<PlayingCardViewProps['size']>, string> = {
  xs: 'w-9 h-13 rounded-lg text-[11px]',
  sm: 'w-12 h-17 sm:w-14 sm:h-20 rounded-xl text-xs',
  md: 'w-16 h-24 sm:w-20 sm:h-28 rounded-xl text-sm',
  lg: 'w-20 h-28 sm:w-24 sm:h-34 rounded-2xl text-base',
};

export function PlayingCardView({
  code,
  faceDown = false,
  playable = false,
  selected = false,
  size = 'md',
  onClick,
  ariaLabel,
}: PlayingCardViewProps) {
  const dims = SIZE_CLASSES[size];

  if (faceDown || !code) {
    const inner = (
      <div
        className={`${dims} relative select-none bg-[#5A142B] border-2 border-[#F5E6EA] shadow-md overflow-hidden flex items-center justify-center transition-transform duration-150 ${
          onClick
            ? 'cursor-pointer hover:-translate-y-1 active:scale-95'
            : ''
        }`}
      >
        <div className="absolute inset-1.5 rounded-lg border border-[#E5B8C8]/45 flex items-center justify-center bg-[#470E21]">
          <svg
            viewBox="0 0 32 32"
            className="w-5 h-5 text-[#F3C5D5]"
            aria-hidden="true"
          >
            <path
              d="M16 4L19.1 12.9L28 16L19.1 19.1L16 28L12.9 19.1L4 16L12.9 12.9L16 4Z"
              fill="currentColor"
              opacity="0.88"
            />
          </svg>
        </div>
      </div>
    );

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel || 'Draw card from stock'}
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F6C4D4]"
        >
          {inner}
        </button>
      );
    }

    return <div aria-hidden="true">{inner}</div>;
  }

  const parsed = parseCard(code);
  const symbol = SUIT_SYMBOLS[parsed.suit];
  const suitColor = parsed.isRed ? 'text-[#C81E51]' : 'text-[#1E1920]';

  const badgeText =
    parsed.rank === '8'
      ? 'WILD'
      : parsed.rank === '2'
        ? '+2'
        : parsed.rank === 'J'
          ? 'SKIP'
          : parsed.rank === 'K'
            ? 'REV'
            : '';

  const cardSurface = (
    <div
      className={`${dims} relative select-none bg-[#FFFDFB] border ${
        playable
          ? 'border-[#FBBF24] ring-2 ring-[#FBBF24]/80 shadow-xl -translate-y-2.5 hover:-translate-y-3.5'
          : selected
            ? 'border-[#D81B60] -translate-y-2 shadow-md'
            : 'border-[#DFD2D7] shadow-md'
      } flex flex-col justify-between p-1.5 sm:p-2 transition-all duration-150 ${suitColor}`}
    >
      {/* Top-left corner index */}
      <div className="flex flex-col items-start leading-none">
        <span className="font-bold tracking-tight tabular-nums">{parsed.rank}</span>
        <span className="text-[0.85em] leading-none mt-0.5">{symbol}</span>
      </div>

      {/* Center pip or court emblem */}
      <div className="flex flex-col items-center justify-center my-auto leading-none">
        <span className={size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}>
          {symbol}
        </span>
        {badgeText && size !== 'xs' && (
          <span className="mt-0.5 text-[9px] font-bold tracking-wider uppercase text-[#8A4A62]">
            {badgeText}
          </span>
        )}
      </div>

      {/* Bottom-right inverted corner index */}
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="font-bold tracking-tight tabular-nums">{parsed.rank}</span>
        <span className="text-[0.85em] leading-none mt-0.5">{symbol}</span>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!playable}
        aria-label={
          ariaLabel ||
          `${parsed.rank} of ${SUIT_NAMES[parsed.suit]}${playable ? ' (Playable)' : ' (Unplayable)'}`
        }
        className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBBF24] ${
          playable ? 'cursor-pointer active:scale-95' : 'cursor-default'
        }`}
      >
        {cardSurface}
      </button>
    );
  }

  return cardSurface;
}
