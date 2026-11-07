import React from 'react';

interface MarqueeStripProps {
  textItems?: string[];
  className?: string;
}

const DEFAULT_ITEMS = [
  'INNOVISION 2026',
  'FACULTY OF SCIENCE & TECHNOLOGY',
  'THE ICFAI UNIVERSITY SIKKIM',
  'INSTITUTION’S INNOVATION COUNCIL (IIC)',
  'LIVE TYPING CHAMPIONSHIP',
  'PRECISION & VELOCITY',
  'HIMALAYAN HACK & CODE',
];

const FLAG_COLORS = ['bg-[#2456A6]', 'bg-[#C2412D]', 'bg-[#2F7D4F]', 'bg-[#D99A0B]'];

export const MarqueeStrip: React.FC<MarqueeStripProps> = ({
  textItems = DEFAULT_ITEMS,
  className = '',
}) => {
  return (
    <div
      className={`overflow-hidden whitespace-nowrap bg-[#C2410C] py-2.5 text-white select-none ${className}`}
      aria-hidden="true"
    >
      <div className="flex animate-marquee">
        {/* First track */}
        <div className="flex items-center shrink-0">
          {textItems.map((item, idx) => (
            <span key={`a-${idx}`} className="flex items-center text-xs sm:text-sm font-extrabold tracking-wider uppercase font-['Bricolage_Grotesque',sans-serif]">
              <span>{item}</span>
              <span
                className={`mx-4 inline-block h-2 w-2 rounded-full ${FLAG_COLORS[idx % FLAG_COLORS.length]}`}
              />
            </span>
          ))}
        </div>

        {/* Duplicate track for seamless infinite scroll */}
        <div className="flex items-center shrink-0">
          {textItems.map((item, idx) => (
            <span key={`b-${idx}`} className="flex items-center text-xs sm:text-sm font-extrabold tracking-wider uppercase font-['Bricolage_Grotesque',sans-serif]">
              <span>{item}</span>
              <span
                className={`mx-4 inline-block h-2 w-2 rounded-full ${FLAG_COLORS[idx % FLAG_COLORS.length]}`}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
