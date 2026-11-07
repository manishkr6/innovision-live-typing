import React, { useRef, useEffect } from 'react';
import { Clock, Zap, Target, AlertCircle, ShieldAlert, CheckCircle, Flame, Lock, Unlock } from 'lucide-react';
import { useTypingEngine } from '../../hooks/useTypingEngine';
import { formatTime, isCharMatch } from '../../utils/scoring';
import { KeystrokeLogItem } from '../../types';

interface TypingArenaProps {
  passageText: string;
  passageTitle?: string;
  difficulty?: string;
  durationSeconds: number;
  allowBackspaceAfterSpace?: boolean;
  isPractice?: boolean;
  isRaceActive?: boolean;
  isLocked?: boolean;
  roundStatus?: string;
  lockMessage?: string;
  synchronizedStartTime?: number | null;
  onFinish?: (results: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
    punctuationAccuracy: number;
    errors: number;
    correctChars: number;
    totalKeystrokes: number;
    blurCount: number;
    flagged: boolean;
    flagReason?: string;
    keystrokes: KeystrokeLogItem[];
    elapsedSeconds: number;
  }) => void;
}

export const TypingArena: React.FC<TypingArenaProps> = ({
  passageText,
  passageTitle,
  difficulty,
  durationSeconds,
  allowBackspaceAfterSpace = true,
  isPractice = false,
  isRaceActive = true,
  isLocked = false,
  roundStatus,
  lockMessage,
  synchronizedStartTime = null,
  onFinish,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const {
    typedText,
    timeLeft,
    isFinished,
    liveWpm,
    liveRawWpm,
    liveAccuracy,
    livePunctuationAccuracy,
    liveErrors,
    progressPercent,
    blurCount,
    blurWarning,
    setBlurWarning,
    containerRef,
    activeCharRef,
    handleKeyDown,
    hasStarted,
  } = useTypingEngine({
    passageText,
    durationSeconds,
    allowBackspaceAfterSpace,
    isPractice,
    isRaceActive,
    isLocked,
    roundStatus,
    synchronizedStartTime,
    onFinish,
  });

  // Keep input focused automatically once unlocked (only for official arena, prevent browser viewport jumps)
  useEffect(() => {
    // Never auto-focus practice arena on mount so viewport stays at the top of the page
    if (isPractice) return;

    if (!isFinished && !isLocked && hiddenInputRef.current) {
      hiddenInputRef.current.focus({ preventScroll: true });
    }
  }, [isFinished, isLocked, isRaceActive, isPractice]);

  const handleArenaClick = () => {
    if (hiddenInputRef.current && !isFinished && !isLocked) {
      hiddenInputRef.current.focus({ preventScroll: true });
    }
  };

  // Anti-cheat: prevent paste, copy, cut, drop, contextmenu
  const handlePreventAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  // Render passage character-by-character
  const renderPassage = () => {
    const chars = passageText.split('');
    const typedLen = typedText.length;

    return chars.map((char, index) => {
      let statusClass = 'text-gray-500';
      const isCurrent = index === typedLen;

      if (index < typedLen) {
        const typedChar = typedText[index];
        if (isCharMatch(typedChar, char)) {
          statusClass = 'text-emerald-400 font-medium';
        } else {
          statusClass = 'text-[#F87171] underline decoration-[#C2412D] decoration-2 underline-offset-4 bg-[#C2412D]/20';
        }
      }

      return (
        <span
          key={index}
          ref={isCurrent ? activeCharRef : null}
          className={`relative transition-colors duration-75 inline-block ${statusClass} ${
            isCurrent && !isLocked ? 'bg-[#FB923C]/20 rounded-xs' : ''
          }`}
        >
          {/* Caret rendering (only when unlocked and not finished) */}
          {isCurrent && !isFinished && !isLocked && (
            <span
              className="absolute -left-[1px] top-0 bottom-0 w-[2.5px] bg-[#FB923C] animate-caret shadow-[0_0_8px_#FB923C]"
              aria-hidden="true"
            />
          )}
          {char === ' ' ? '\u00A0' : char}
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-4 dark-arena select-none">
      {/* Anti-cheat tab switch warning banner */}
      {blurWarning && blurCount > 0 && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-xl bg-[#C2412D]/20 border border-[#C2412D]/50 text-white flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <ShieldAlert className="w-5 h-5 text-[#FB923C] shrink-0" />
            <span>
              <strong>Warning: Tab blur detected ({blurCount})!</strong> Window switching is strictly logged for organizer anti-cheat review.
            </span>
          </div>
          <button
            onClick={() => setBlurWarning(false)}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-md cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Lock banner if competition is not started by organizer */}
      {isLocked && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-2xl bg-[#0D111C] border border-[#FB923C]/40 text-white flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FB923C]/20 border border-[#FB923C]/40 text-[#FB923C] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2 font-['Bricolage_Grotesque',sans-serif]">
                <span>Competition Input Locked</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FB923C]/20 text-[#FB923C]">
                  ORGANIZER CONTROLLED
                </span>
              </p>
              <p className="text-xs text-gray-300 mt-0.5">
                {lockMessage ||
                  'The organizer has not started the competition. You cannot type yet. When the organizer clicks Start, a 10-second synchronized countdown will unlock all competitors simultaneously.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Night Arena Container */}
      <div
        onClick={handleArenaClick}
        className={`rounded-3xl bg-[#0D111C] border ${
          isLocked ? 'border-amber-500/30 opacity-90' : 'border-white/10'
        } p-5 sm:p-8 shadow-2xl relative overflow-hidden ${isLocked ? 'cursor-not-allowed' : 'cursor-text'}`}
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-[#FB923C]/10 via-transparent to-transparent pointer-events-none" />

        {/* Live HUD Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              isLocked
                ? 'bg-[#17151F] border-amber-500/40 text-[#FB923C]'
                : 'bg-[#17151F] border-white/10 text-[#FB923C]'
            }`}>
              {isLocked ? <Lock className="w-4 h-4" /> : <Flame className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-['Bricolage_Grotesque',sans-serif]">
                  {passageTitle || 'Official Passage'}
                </span>
                {difficulty && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      difficulty === 'Hard'
                        ? 'bg-[#C2412D]/20 text-[#FB923C]'
                        : difficulty === 'Medium'
                        ? 'bg-[#D99A0B]/20 text-[#D99A0B]'
                        : 'bg-[#2F7D4F]/20 text-emerald-400'
                    }`}
                  >
                    {difficulty}
                  </span>
                )}
                {isPractice && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#38BDF8]/20 text-[#38BDF8]">
                    Practice Warmup
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">
                {isLocked ? (
                  <span className="text-[#FB923C] font-semibold">● Locked until organizer starts round</span>
                ) : (
                  allowBackspaceAfterSpace ? 'Backspace: Free' : 'Backspace: Locked after space'
                )}
              </p>
            </div>
          </div>

          {/* Telemetry Counters */}
          <div className="flex items-center gap-3 sm:gap-6 font-mono">
            {/* Live Net WPM */}
            <div className="text-right">
              <span className="text-[10px] uppercase text-gray-400 block tracking-wider">Net WPM</span>
              <span className="text-2xl sm:text-3xl font-black text-[#FB923C] font-['Bebas_Neue',sans-serif] tracking-wider">
                {liveWpm}
              </span>
            </div>

            {/* Accuracy */}
            <div className="text-right border-l border-white/10 pl-3 sm:pl-5">
              <span className="text-[10px] uppercase text-gray-400 block tracking-wider">Accuracy</span>
              <span className="text-lg sm:text-xl font-bold text-white">
                {liveAccuracy}%
              </span>
            </div>

            {/* Punctuation */}
            <div className="hidden sm:block text-right border-l border-white/10 pl-3 sm:pl-5">
              <span className="text-[10px] uppercase text-gray-400 block tracking-wider">Punctuation</span>
              <span className="text-lg sm:text-xl font-bold text-[#D99A0B]">
                {livePunctuationAccuracy}%
              </span>
            </div>

            {/* Time Left */}
            <div className="text-right border-l border-white/10 pl-3 sm:pl-5">
              <span className="text-[10px] uppercase text-gray-400 block tracking-wider flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3 text-[#38BDF8]" /> Time
              </span>
              <span
                className={`text-lg sm:text-xl font-bold ${
                  timeLeft <= 10 && !isLocked ? 'text-[#F87171] animate-pulse' : 'text-white'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-[#FB923C] to-[#C2410C] transition-all duration-150 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Typing Passage Display (auto-scrolling, monospace, exact-match) */}
        <div
          ref={containerRef}
          className={`typing-passage-container relative h-48 sm:h-56 overflow-y-auto font-['JetBrains_Mono',monospace] text-base sm:text-lg lg:text-xl leading-relaxed sm:leading-loose tracking-wide p-4 rounded-2xl ${
            isLocked ? 'bg-[#07090E]/95 border-amber-500/20' : 'bg-[#07090E]/80 border-white/5'
          } border focus:outline-none`}
          tabIndex={isLocked ? -1 : 0}
          onKeyDown={handleKeyDown}
          onPaste={handlePreventAction}
          onCopy={handlePreventAction}
          onCut={handlePreventAction}
          onDrop={handlePreventAction}
          onContextMenu={handlePreventAction}
          aria-label="Typing passage arena"
        >
          {isLocked && (
            <div className="sticky top-2 z-20 mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center justify-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#FB923C]" />
              <span>KEYBOARD LOCKED — Awaiting Organizer Start Trigger</span>
            </div>
          )}
          {renderPassage()}
        </div>

        {/* Hidden capture input to ensure reliable focus on all browser setups */}
        <input
          ref={hiddenInputRef}
          type="text"
          disabled={isLocked}
          className="opacity-0 absolute -left-[9999px] pointer-events-none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onKeyDown={handleKeyDown}
          onPaste={handlePreventAction}
          onCopy={handlePreventAction}
          onCut={handlePreventAction}
          aria-hidden="true"
        />

        {/* Footer info & live hints */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2 font-mono">
          <div className="flex items-center gap-2">
            {isLocked ? (
              <span className="text-[#FB923C] font-semibold flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Competition is currently locked.
              </span>
            ) : synchronizedStartTime && hasStarted ? (
              <span className="text-[#38BDF8] animate-pulse font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#FB923C]" /> Official race clock is ticking down automatically! Type now!
              </span>
            ) : !hasStarted && !isFinished ? (
              <span className="text-[#FB923C] animate-pulse font-semibold">
                ● Start typing to begin...
              </span>
            ) : isFinished ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Test concluded. Submitting score...
              </span>
            ) : (
              <span>Racing active • Progress: {typedText.length} / {passageText.length} chars</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>Errors: <strong className="text-white">{liveErrors}</strong></span>
            <span>Raw: <strong className="text-white">{liveRawWpm} WPM</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
