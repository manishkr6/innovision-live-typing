import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, RefreshCw, Play, Settings, ArrowRight, Zap, Target } from 'lucide-react';
import { TypingArena } from '../components/arena/TypingArena';
import { PASSAGES, getPassagesByDifficulty } from '../data/passages';
import { DifficultyLevel, Passage } from '../types';
import { TiltCard } from '../components/common/TiltCard';

export const PracticePage: React.FC = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Medium');
  const [duration, setDuration] = useState<number>(60);
  const [allowBackspaceAfterSpace, setAllowBackspaceAfterSpace] = useState<boolean>(true);
  const [currentPassageIndex, setCurrentPassageIndex] = useState<number>(0);
  const [lastResult, setLastResult] = useState<any | null>(null);

  const availablePassages = getPassagesByDifficulty(selectedDifficulty);
  const currentPassage: Passage = availablePassages[currentPassageIndex % availablePassages.length] || PASSAGES[0];

  const handleNextPassage = () => {
    setCurrentPassageIndex(prev => (prev + 1) % availablePassages.length);
    setLastResult(null);
  };

  const handleFinish = (results: any) => {
    setLastResult(results);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#17151F] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2F7D4F]/20 text-emerald-400 border border-[#2F7D4F]/30">
                Warmup Ground
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Practice scores are private & not published to official ranks
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Bricolage_Grotesque',sans-serif] text-white">
              Typing Speed Warmup & Calibration
            </h1>
          </div>

          <Link
            to="/arena"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Join Official Race</span>
          </Link>
        </div>

        {/* Configuration Bar */}
        <div className="bg-[#0D111C] border border-white/10 rounded-2xl p-4 sm:p-5 mb-8 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          {/* Difficulty tabs */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">DIFFICULTY:</span>
            {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map(diff => (
              <button
                key={diff}
                onClick={() => {
                  setSelectedDifficulty(diff);
                  setCurrentPassageIndex(0);
                  setLastResult(null);
                }}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-[#FB923C] text-black shadow-xs'
                    : 'bg-[#111726] text-gray-300 hover:bg-[#17151F]'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Duration tabs */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">TIME:</span>
            {[30, 60, 120].map(d => (
              <button
                key={d}
                onClick={() => {
                  setDuration(d);
                  setLastResult(null);
                }}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                  duration === d
                    ? 'bg-[#38BDF8] text-black shadow-xs'
                    : 'bg-[#111726] text-gray-300 hover:bg-[#17151F]'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          {/* Refresh Passage */}
          <button
            onClick={handleNextPassage}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111726] hover:bg-[#17151F] text-gray-300 border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Shuffle Passage</span>
          </button>
        </div>

        {/* Practice Arena */}
        <TypingArena
          key={`${currentPassage.id}-${duration}-${allowBackspaceAfterSpace}`}
          passageText={currentPassage.text}
          passageTitle={currentPassage.title}
          difficulty={currentPassage.difficulty}
          durationSeconds={duration}
          allowBackspaceAfterSpace={allowBackspaceAfterSpace}
          isPractice={true}
          onFinish={handleFinish}
        />

        {/* Last Result Card if completed */}
        {lastResult && (
          <div className="mt-8">
            <TiltCard className="rounded-3xl bg-[#0D111C] border border-[#38BDF8]/30 p-6 sm:p-8 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#38BDF8]">
                    PRACTICE DRILL COMPLETED
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-['Bricolage_Grotesque',sans-serif] text-white">
                    {lastResult.wpm} Net WPM • {lastResult.accuracy}% Accuracy
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleNextPassage}
                    className="px-4 py-2 rounded-full bg-[#17151F] hover:bg-[#111726] text-xs font-mono text-gray-300 border border-white/10 transition-colors cursor-pointer"
                  >
                    Try Another Drill
                  </button>
                  <Link
                    to="/arena"
                    className="inline-flex items-center gap-1 px-5 py-2 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-xs font-bold text-white shadow-xs transition-colors"
                  >
                    <span>Official Race</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-xs">
                <div className="bg-[#111726] p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">PUNCTUATION</span>
                  <span className="text-lg font-bold text-[#D99A0B]">{lastResult.punctuationAccuracy}%</span>
                </div>
                <div className="bg-[#111726] p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">RAW SPEED</span>
                  <span className="text-lg font-bold text-white">{lastResult.rawWpm} WPM</span>
                </div>
                <div className="bg-[#111726] p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">ERRORS</span>
                  <span className="text-lg font-bold text-[#FB923C]">{lastResult.errors}</span>
                </div>
                <div className="bg-[#111726] p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">ELAPSED</span>
                  <span className="text-lg font-bold text-[#38BDF8]">{lastResult.elapsedSeconds}s</span>
                </div>
              </div>
            </TiltCard>
          </div>
        )}
      </div>
    </div>
  );
};
