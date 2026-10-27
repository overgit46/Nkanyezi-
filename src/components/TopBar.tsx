interface TopBarProps {
  onOpenLetter: () => void;
}

export function TopBar({ onOpenLetter }: TopBarProps) {
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

        {/* Zone 2: 4 clean single-line text navigation links */}
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
          <a
            href="#date-vouchers"
            className="hover:text-[#1F1518] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Our Next Date
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
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
