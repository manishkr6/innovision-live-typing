import React, { useState, useEffect } from 'react';
import { Keyboard, X, AlertTriangle } from 'lucide-react';

export const PhysicalKeyboardNotice: React.FC = () => {
  const [isTouch, setIsTouch] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if device supports primary touch or lacks fine pointer
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 800;
    if (hasTouch || isSmallScreen) {
      setIsTouch(true);
    }
  }, []);

  if (!isTouch || dismissed) return null;

  return (
    <aside
      aria-label="Hardware recommendation"
      className="bg-[#FFF4EC] border-b border-[#FDE3D0] px-4 py-2 text-xs sm:text-sm text-[#7C2D12] flex items-center justify-between shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-2.5 flex-1">
        <Keyboard className="w-4 h-4 text-[#C2410C] shrink-0" aria-hidden="true" />
        <span className="font-medium">
          <strong className="font-bold text-[#9A3412]">Physical Keyboard Recommended:</strong> For competitive fairness and peak WPM scoring, INNOVISION races require a physical hardware keyboard.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-[#FDE3D0] rounded-md text-[#7C2D12] transition-colors cursor-pointer"
        aria-label="Dismiss keyboard notification"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
};
