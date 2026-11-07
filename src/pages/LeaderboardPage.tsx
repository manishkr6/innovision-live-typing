import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Maximize2, Minimize2, Flame, Users } from 'lucide-react';
import { useCompetition } from '../context/CompetitionContext';
import { rankAttempts } from '../utils/scoring';
import { Attempt } from '../types';

export const LeaderboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isProjectorParam = searchParams.get('projector') === 'true';

  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(isProjectorParam);
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [deduplicateMode, setDeduplicateMode] = useState<boolean>(true);
  const [roundFilter, setRoundFilter] = useState<string>('active');
  const { attempts, config, activeRound, rounds } = useCompetition();

  // Sync state with URL param
  useEffect(() => {
    setIsProjectorMode(searchParams.get('projector') === 'true');
  }, [searchParams]);

  const toggleProjectorMode = () => {
    const nextVal = !isProjectorMode;
    setIsProjectorMode(nextVal);
    if (nextVal) {
      setSearchParams({ projector: 'true' });
    } else {
      searchParams.delete('projector');
      setSearchParams(searchParams);
    }
  };

  // Determine active round context
  const targetRoundId =
    roundFilter === 'active'
      ? config.activeRoundId
      : roundFilter === 'all'
      ? null
      : roundFilter;

  const baseAttempts = targetRoundId
    ? attempts.filter(a => a.roundId === targetRoundId)
    : attempts;

  const filteredAttempts =
    departmentFilter === 'All'
      ? baseAttempts
      : departmentFilter === 'Others'
      ? baseAttempts.filter(
          a =>
            a.department.toLowerCase().includes('other') ||
            (!a.department.includes('CSE') &&
              !a.department.includes('AI & DS') &&
              !a.department.includes('IT') &&
              !a.department.includes('Civil') &&
              !a.department.includes('Mechanical'))
        )
      : baseAttempts.filter(a => a.department.includes(departmentFilter));

  const rankedAttempts = rankAttempts(filteredAttempts, { deduplicate: deduplicateMode });
  const scoredAttempts = rankedAttempts.filter(a => a.wpm > 0 || (a.correctChars && a.correctChars > 0));

  // Departments list for filter
  const departments = ['All', 'CSE', 'AI & DS', 'IT', 'Civil', 'Mechanical', 'Others'];

  // Medal styling helper
  const getMedalBadge = (rank: number, attempt?: Attempt) => {
    if (attempt && attempt.wpm === 0 && (!attempt.correctChars || attempt.correctChars === 0)) {
      return (
        <span className="font-mono text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          PENDING
        </span>
      );
    }

    switch (rank) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#D99A0B]/20 text-[#D99A0B] border border-[#D99A0B]/40 shadow-sm shadow-[#D99A0B]/20">
            <Medal className="w-3.5 h-3.5" /> GOLD #1
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-slate-300/20 text-slate-200 border border-slate-300/40">
            <Medal className="w-3.5 h-3.5" /> SILVER #2
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#C2410C]/20 text-[#FB923C] border border-[#C2410C]/40">
            <Medal className="w-3.5 h-3.5" /> BRONZE #3
          </span>
        );
      default:
        return (
          <span className="font-mono text-sm font-bold text-gray-400">
            #{rank}
          </span>
        );
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-4.5rem)] bg-[#17151F] text-white selection:bg-[#FB923C]/30 ${
        isProjectorMode ? 'p-6 sm:p-12' : 'py-8 px-4 sm:px-6 lg:px-8'
      }`}
    >
      <div className={`${isProjectorMode ? 'max-w-[1600px]' : 'max-w-6xl'} mx-auto`}>
        {/* Leaderboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                config.resultsPublished
                  ? 'bg-[#D99A0B]/20 text-[#D99A0B] border border-[#D99A0B]/40'
                  : 'bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/30'
              }`}>
                <Flame className="w-3 h-3" />
                {config.resultsPublished ? '🏆 Official Results Published' : 'Live Standings'}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {roundFilter === 'all'
                  ? 'Tournament Overall'
                  : (activeRound?.name || 'Championship Qualifier')}
              </span>
            </div>
            <h1
              className={`font-black font-['Bricolage_Grotesque',sans-serif] text-white tracking-tight ${
                isProjectorMode ? 'text-4xl sm:text-6xl' : 'text-3xl sm:text-4xl'
              }`}
            >
              INNOVISION <span className="text-[#FB923C]">2026</span> Leaderboard
            </h1>
          </div>

          {/* Controls: Deduplication toggle, Round filter, Department filter & Projector toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Deduplication Toggle: Best Score Per Student vs All Runs */}
            <button
              onClick={() => setDeduplicateMode(!deduplicateMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                deduplicateMode
                  ? 'bg-[#0F2236] text-[#38BDF8] border-[#38BDF8]/40 shadow-xs'
                  : 'bg-[#0D111C] text-gray-400 border-white/10 hover:text-white'
              }`}
              title={
                deduplicateMode
                  ? 'Currently showing single best score per competitor. Click to view all submission attempts.'
                  : 'Currently showing all runs. Click to deduplicate by student.'
              }
            >
              <Users className="w-3.5 h-3.5" />
              <span>{deduplicateMode ? 'Best Score / Student' : 'All Runs'}</span>
            </button>

            {/* Optional Round Filter if multiple rounds exist */}
            {rounds.length > 1 && !isProjectorMode && (
              <select
                value={roundFilter}
                onChange={e => setRoundFilter(e.target.value)}
                className="bg-[#0D111C] text-xs text-gray-300 border border-white/10 rounded-full px-3 py-1.5 focus:outline-none focus:border-[#38BDF8] cursor-pointer"
              >
                <option value="active">Active Round ({activeRound?.name || 'Current'})</option>
                {rounds.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                <option value="all">Overall (All Rounds)</option>
              </select>
            )}

            {!isProjectorMode && (
              <div className="flex items-center gap-1 bg-[#0D111C] p-1 rounded-full border border-white/10">
                {departments.map(dept => (
                  <button
                    key={dept}
                    onClick={() => setDepartmentFilter(dept)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      departmentFilter === dept
                        ? 'bg-[#1C1917] text-[#38BDF8] border border-[#38BDF8]/40'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={toggleProjectorMode}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D111C] hover:bg-[#131B2E] text-xs sm:text-sm font-semibold text-[#38BDF8] border border-[#38BDF8]/30 transition-all cursor-pointer shadow-sm"
              title="Toggle Large Display for Stage Projector"
            >
              {isProjectorMode ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit Projector Mode</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Projector Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Official Results Published Banner */}
        {config.resultsPublished && (
          <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#D99A0B]/20 via-[#FB923C]/10 to-transparent border-2 border-[#D99A0B]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D99A0B] text-black flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-sm font-bold text-white font-['Bricolage_Grotesque',sans-serif]">
                  Official Tournament Results Published
                </p>
                <p className="text-xs text-gray-300">
                  All standings, net typing speeds, and accuracy benchmarks have been officially published by the FST faculty organizers.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#D99A0B] bg-[#D99A0B]/20 px-3.5 py-1 rounded-full border border-[#D99A0B]/40 whitespace-nowrap">
              Final Official Standings
            </span>
          </div>
        )}

        {/* Top 3 Podium Highlights (Hero Display) - Dynamic and distinct per student */}
        {scoredAttempts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Rank 2 (Silver) */}
            {scoredAttempts[1] ? (
              <div className="order-2 md:order-1 rounded-3xl bg-[#0D111C] border border-slate-400/20 p-5 text-center relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-slate-300/10 text-slate-200 border border-slate-400/30 mb-3">
                    <Medal className="w-3.5 h-3.5 text-slate-300" /> SILVER MEDAL
                  </div>
                  <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-white truncate">
                    {scoredAttempts[1].participantName}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    {scoredAttempts[1].department} • Roll: {scoredAttempts[1].rollNo || 'N/A'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-black font-['Bebas_Neue',sans-serif] text-slate-200">
                    {scoredAttempts[1].wpm}
                  </span>
                  <span className="text-xs font-mono text-gray-400">WPM ({scoredAttempts[1].accuracy}%)</span>
                </div>
              </div>
            ) : (
              <div className="order-2 md:order-1 rounded-3xl bg-[#0D111C]/40 border border-dashed border-slate-400/20 p-5 text-center relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-slate-300/10 text-slate-400 border border-slate-400/20 mb-3">
                    <Medal className="w-3.5 h-3.5 text-slate-400" /> SILVER MEDAL
                  </div>
                  <h3 className="text-lg font-bold font-['Bricolage_Grotesque',sans-serif] text-gray-400">
                    Awaiting Challenger
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Live race in progress...
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 text-gray-500 font-mono text-xs">
                  Next distinct typist takes 2nd
                </div>
              </div>
            )}

            {/* Rank 1 (Gold - Elevated Champion) */}
            <div className="order-1 md:order-2 rounded-3xl bg-radial from-[#D99A0B]/20 via-[#0D111C] to-[#0D111C] border-2 border-[#D99A0B]/50 p-6 text-center relative overflow-hidden shadow-2xl shadow-[#D99A0B]/10 flex flex-col justify-between transform md:-translate-y-2">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#D99A0B]/20 blur-3xl pointer-events-none" />
              <div>
                <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-black bg-[#D99A0B]/30 text-[#D99A0B] border border-[#D99A0B]/50 mb-3">
                  <Trophy className="w-4 h-4 text-[#D99A0B]" /> CHAMPION • GOLD #1
                </div>
                <h3 className="text-2xl font-black font-['Bricolage_Grotesque',sans-serif] text-white truncate">
                  {scoredAttempts[0].participantName}
                </h3>
                <p className="text-xs text-[#FB923C] font-mono mt-0.5">
                  {scoredAttempts[0].department} • Roll: {scoredAttempts[0].rollNo || 'N/A'} ({scoredAttempts[0].year})
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black font-['Bebas_Neue',sans-serif] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-[#D99A0B]">
                  {scoredAttempts[0].wpm}
                </span>
                <span className="text-sm font-mono text-gray-300">WPM ({scoredAttempts[0].accuracy}%)</span>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            {scoredAttempts[2] ? (
              <div className="order-3 rounded-3xl bg-[#0D111C] border border-[#C2410C]/30 p-5 text-center relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-[#C2410C]/20 text-[#FB923C] border border-[#C2410C]/40 mb-3">
                    <Medal className="w-3.5 h-3.5 text-[#FB923C]" /> BRONZE MEDAL
                  </div>
                  <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-white truncate">
                    {scoredAttempts[2].participantName}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    {scoredAttempts[2].department} • Roll: {scoredAttempts[2].rollNo || 'N/A'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-black font-['Bebas_Neue',sans-serif] text-[#FB923C]">
                    {scoredAttempts[2].wpm}
                  </span>
                  <span className="text-xs font-mono text-gray-400">WPM ({scoredAttempts[2].accuracy}%)</span>
                </div>
              </div>
            ) : (
              <div className="order-3 rounded-3xl bg-[#0D111C]/40 border border-dashed border-[#C2410C]/20 p-5 text-center relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-[#C2410C]/10 text-[#FB923C]/60 border border-[#C2410C]/20 mb-3">
                    <Medal className="w-3.5 h-3.5 text-[#FB923C]/60" /> BRONZE MEDAL
                  </div>
                  <h3 className="text-lg font-bold font-['Bricolage_Grotesque',sans-serif] text-gray-400">
                    Awaiting Challenger
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Live race in progress...
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 text-gray-500 font-mono text-xs">
                  Next distinct typist takes 3rd
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Leaderboard Table with Motion Layout */}
        <div className="rounded-3xl bg-[#0D111C] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#07090E]/60 text-[11px] font-mono uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-4 sm:px-6">Rank</th>
                  <th className="py-4 px-4 sm:px-6">Competitor</th>
                  <th className="py-4 px-4 sm:px-6">Department</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Net WPM</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Accuracy</th>
                  <th className="py-4 px-4 sm:px-6 text-right hidden md:table-cell">Punctuation</th>
                  <th className="py-4 px-4 sm:px-6 text-right hidden sm:table-cell">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-sm">
                <AnimatePresence>
                  {rankedAttempts.map((item, idx) => {
                    const isTopThree = idx < 3 && (item.wpm > 0 || (item.correctChars && item.correctChars > 0));
                    return (
                      <motion.tr
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className={`hover:bg-[#131B2E] transition-colors ${
                          isTopThree ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                          {getMedalBadge(item.rank || idx + 1, item)}
                        </td>

                        {/* Competitor */}
                        <td className="py-4 px-4 sm:px-6 font-['Bricolage_Grotesque',sans-serif]">
                          <span
                            className={`font-bold block ${
                              isProjectorMode ? 'text-lg sm:text-xl' : 'text-base'
                            } ${idx === 0 && item.wpm > 0 ? 'text-[#D99A0B]' : 'text-white'}`}
                          >
                            {item.participantName}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            Roll: {item.rollNo || 'N/A'} • {item.year}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-gray-300">
                          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px]">
                            {item.department}
                          </span>
                        </td>

                        {/* Net WPM */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <span
                            className={`font-black font-['Bebas_Neue',sans-serif] tracking-wider ${
                              isProjectorMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
                            } ${
                              idx === 0 && item.wpm > 0
                                ? 'text-[#D99A0B]'
                                : idx === 1 && item.wpm > 0
                                ? 'text-slate-200'
                                : idx === 2 && item.wpm > 0
                                ? 'text-[#FB923C]'
                                : 'text-white'
                            }`}
                          >
                            {item.wpm}
                          </span>
                          <span className="text-[10px] text-gray-500 block -mt-1">wpm</span>
                        </td>

                        {/* Accuracy */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap font-bold text-gray-200">
                          {item.accuracy}%
                        </td>

                        {/* Punctuation */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap text-gray-300 hidden md:table-cell">
                          {item.punctuationAccuracy}%
                        </td>

                        {/* Errors */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap text-gray-400 hidden sm:table-cell">
                          {item.errors}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {rankedAttempts.length === 0 && (
              <div className="text-center py-16 text-gray-400 font-mono text-sm">
                <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p>No race attempts recorded yet for this round.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Scores will populate here automatically as competitors finish.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
