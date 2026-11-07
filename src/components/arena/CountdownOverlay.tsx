import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Clock } from 'lucide-react';

interface CountdownOverlayProps {
  startAt: number; // target epoch timestamp in ms
  onCountdownComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  startAt,
  onCountdownComplete,
}) => {
  const [remainingSecs, setRemainingSecs] = useState<number>(() => {
    return Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
  });

  const onCompleteRef = React.useRef(onCountdownComplete);
  onCompleteRef.current = onCountdownComplete;
  const hasCompletedRef = React.useRef(false);

  useEffect(() => {
    hasCompletedRef.current = false;
    const tick = () => {
      const diff = Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
      setRemainingSecs(diff);

      if (diff <= 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [startAt]);

  const displayValue = remainingSecs > 0 ? remainingSecs : 'GO!';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#17151F]/90 backdrop-blur-xl text-white select-none px-4"
    >
      <div className="absolute top-10 flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D111C] border border-white/10 text-xs sm:text-sm font-mono text-[#38BDF8]">
        <Clock className="w-4 h-4 text-[#FB923C] animate-spin" />
        <span>SYNCHRONIZED RACE START</span>
      </div>

      <div className="text-center max-w-md mx-auto">
        <p className="text-xs sm:text-sm uppercase tracking-widest text-[#FB923C] font-extrabold mb-3 font-['Bricolage_Grotesque',sans-serif]">
          INNOVISION 2026 LIVE TYPING ROUND
        </p>

        <h2 className="text-lg sm:text-xl font-bold text-gray-300 mb-8">
          Place hands on home row. All competitors start simultaneously!
        </h2>

        {/* Animated Countdown Ring & Number */}
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
          {/* Glowing orbital ring */}
          <div className="absolute inset-0 rounded-full border-4 border-[#38BDF8]/20 animate-ping opacity-30" />
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#FB923C]/50 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-0 rounded-full bg-radial from-[#FB923C]/20 via-transparent to-transparent" />

          <div
            key={displayValue}
            className="animate-in zoom-in-75 duration-200 font-['Bebas_Neue',sans-serif] text-8xl sm:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-[#FB923C] to-[#C2410C] drop-shadow-[0_10px_25px_rgba(251,146,60,0.4)]"
          >
            {displayValue}
          </div>
        </div>

        <p className="text-xs text-gray-400 font-mono mt-8">
          Do not switch browser tabs • Anti-cheat monitor active
        </p>
      </div>
    </div>
  );
};
