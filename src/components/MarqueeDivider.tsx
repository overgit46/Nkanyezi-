export function MarqueeDivider() {
  const items = [
    'Nkanyezi yami',
    'Honest Heart',
    'Brilliant Mind',
    'Gentle Empathy',
    'Always Listening',
    'Suburban Sweetheart',
  ];

  return (
    <div
      aria-hidden="true"
      className="py-4 border-y border-[#EFE3E7] bg-[#FAF4F6] overflow-hidden select-none"
    >
      <div className="animate-marquee-ribbon">
        {[0, 1].map((pass) => (
          <div key={pass} className="flex items-center gap-8 pr-8 text-sm text-[#8B5D6D]">
            {items.map((phrase, idx) => (
              <span key={`${pass}-${idx}`} className="inline-flex items-center gap-8 whitespace-nowrap">
                <span className="font-editorial italic text-base text-[#6E3B4E]">{phrase}</span>
                <span className="text-[#D4A7B6]">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
