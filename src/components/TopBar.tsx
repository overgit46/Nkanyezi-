interface TopBarProps {
  onOpenLetter: () => void;
  onOpenGames: () => void;
  onOpenLiveRoom?: () => void;
  roomCode?: string | null;
}

export function TopBar({
  onOpenLetter,
  onOpenGames,
  onOpenLiveRoom,
  roomCode,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-[#FDFBF9]/90 backdrop-blur-md border-b border-[#EFE3E7]">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="font-editorial text-xl font-semibold tracking-tight text-[#1F1518] whitespace-nowrap shrink-0 min-h-[44px] inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
        >
          Nkanyezi
        </a>

        {/* Zone 2: 5 clean single-line text navigation items */}
        <nav
          aria-label="Primary sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B535B]"
        >
          <a
            href="#reasons"
            className="hover:text-[#1F1518] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Why It’s You
          </a>
          <a
            href="#moments"
            className="hover:text-[#1F1518] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Camera Roll
          </a>
          <a
            href="#open-when"
            className="hover:text-[#1F1518] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Open When
          </a>
          <button
            type="button"
            onClick={onOpenGames}
            className="hover:text-[#D81B60] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 py-2 cursor-pointer"
          >
            Game Lounge
          </button>
          <a
            href="#date-vouchers"
            className="hover:text-[#1F1518] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Our Next Date
          </a>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenLiveRoom && (
            <button
              type="button"
              onClick={onOpenLiveRoom}
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#E8D1D9] hover:border-[#D81B60] text-xs font-semibold text-[#573E47] hover:text-[#D81B60] bg-[#FAF5F7] hover:bg-[#FFF0F5] transition-all inline-flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
              title={roomCode ? `Connected to 2-Phone Room ${roomCode}` : 'Connect 2 Phones'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  roomCode ? 'bg-emerald-500 animate-pulse' : 'bg-[#C4A5B1]'
                }`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {roomCode ? `Live: ${roomCode}` : '2-Phone Sync'}
              </span>
              <span className="sm:hidden">{roomCode ? roomCode : 'Sync'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLetter}
            className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#D81B60] rounded-xl hover:bg-[#BE1250] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D81B60]"
          >
            Read Your Letter
          </button>
        </div>
      </div>
    </header>
  );
}
