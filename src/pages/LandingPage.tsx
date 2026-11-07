import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Play, Shield, Users, Award, Sparkles, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import { MagneticButton } from '../components/common/MagneticButton';
import { Reveal } from '../components/common/Reveal';
import { MarqueeStrip } from '../components/common/MarqueeStrip';
import { TiltCard } from '../components/common/TiltCard';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, participant, signInGoogle } = useAuth();
  const { config, participants, activeRound } = useCompetition();

  const handleJoin = () => {
    if (participant) {
      navigate('/arena');
    } else {
      navigate('/register');
    }
  };

  const getStatusDisplay = () => {
    switch (config.status) {
      case 'live':
        return {
          pill: 'bg-[#C2412D]/15 text-[#9B2C1C] border-[#C2412D]/30',
          dot: 'bg-[#C2412D] animate-ping',
          label: 'Live Race In Progress',
        };
      case 'waiting':
        return {
          pill: 'bg-[#D99A0B]/20 text-[#7C2D12] border-[#D99A0B]/40',
          dot: 'bg-[#D99A0B]',
          label: 'Lobby Open • Waiting for Start',
        };
      case 'finished':
        return {
          pill: 'bg-[#1C1917]/10 text-[#5F5852] border-[#E2D9CC]',
          dot: 'bg-[#5F5852]',
          label: 'Competition Finished',
        };
      case 'registration_open':
      default:
        return {
          pill: 'bg-[#2F7D4F]/15 text-[#24603D] border-[#2F7D4F]/30',
          dot: 'bg-[#2F7D4F]',
          label: 'Registration Open',
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="min-h-screen bg-[#FBF8F3] text-[#1C1917]">
      {/* Prayer-flag Marquee strip */}
      <MarqueeStrip />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <Reveal delay={0.1}>
              {/* Event Kicker & Live Status */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#9A3412]">
                  FST • ICFAI UNIVERSITY SIKKIM WITH IIC
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${status.pill}`}
                >
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <h1 className="font-['Bricolage_Grotesque',sans-serif] font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight text-[#1C1917] leading-[0.92] mb-6">
                INNOVISION <span className="text-[#C2410C]">2026</span>
                <span className="block text-3xl sm:text-5xl font-extrabold text-[#3F3A36] mt-2">
                  Live Typing Arena
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.3}>
              <p className="font-['Inter',sans-serif] text-base sm:text-xl text-[#3F3A36] leading-relaxed max-w-2xl mb-8">
                The official collegiate speed and accuracy typing championship of Sikkim. Synchronized countdown, case-sensitive Himalayan & technical prose, anti-cheat telemetry, and live projector leaderboard.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={0.4}>
              <div className="flex flex-wrap items-center gap-4">
                <MagneticButton
                  onClick={handleJoin}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-base sm:text-lg shadow-xl shadow-[#C2410C]/25 transition-all btn-shimmer-sweep"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>{participant ? 'Enter Race Lobby' : 'Join Competition'}</span>
                </MagneticButton>

                <Link
                  to="/leaderboard"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#17151F] hover:bg-[#0D111C] text-[#38BDF8] border border-[#38BDF8]/40 font-bold text-base shadow-md transition-all"
                >
                  <Trophy className="w-5 h-5 text-[#D99A0B]" />
                  <span>Live Leaderboard</span>
                </Link>
              </div>
            </Reveal>

            {/* Key stats row */}
            <Reveal delay={0.5}>
              <div className="grid grid-cols-3 gap-4 pt-10 mt-10 border-t border-[#E2D9CC] max-w-lg">
                <div>
                  <span className="block text-2xl sm:text-3xl font-black font-['Bebas_Neue',sans-serif] text-[#1C1917]">
                    {participants.length}
                  </span>
                  <span className="text-xs text-[#5F5852] font-medium">Registered Competitors</span>
                </div>
                <div>
                  <span className="block text-2xl sm:text-3xl font-black font-['Bebas_Neue',sans-serif] text-[#C2410C]">
                    {activeRound?.duration || 60}s
                  </span>
                  <span className="text-xs text-[#5F5852] font-medium">Synchronized Race</span>
                </div>
                <div>
                  <span className="block text-2xl sm:text-3xl font-black font-['Bebas_Neue',sans-serif] text-[#2456A6]">
                    100%
                  </span>
                  <span className="text-xs text-[#5F5852] font-medium">Punctuation Exact</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Hero Visual: Night Arena Preview Card */}
          <Reveal delay={0.3}>
            <TiltCard className="rounded-3xl bg-[#17151F] border border-white/10 p-6 sm:p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#C2412D]" />
                  <span className="w-3 h-3 rounded-full bg-[#D99A0B]" />
                  <span className="w-3 h-3 rounded-full bg-[#2F7D4F]" />
                  <span className="text-xs font-mono text-gray-400 ml-2">ARENA: INNOVISION_2026</span>
                </div>
                <span className="text-[11px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded-md border border-[#38BDF8]/20">
                  REALTIME
                </span>
              </div>

              <div className="bg-[#0B0F19] rounded-2xl p-4 font-mono text-xs sm:text-sm text-gray-300 leading-relaxed mb-4 border border-white/5">
                <span className="text-emerald-400">At 05:30 AM, the first rays of sunlight strike </span>
                <span className="bg-[#FB923C]/30 text-white border-l-2 border-[#FB923C] px-0.5">M</span>
                <span className="text-gray-500">t. Kangchenjunga (8,586 meters). Morning mist drifts gently...</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-[#111726] p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 block">NET SPEED</span>
                  <span className="text-xl font-black text-[#FB923C] font-['Bebas_Neue',sans-serif]">94.2 WPM</span>
                </div>
                <div className="bg-[#111726] p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 block">ACCURACY</span>
                  <span className="text-xl font-bold text-white">99.1%</span>
                </div>
                <div className="bg-[#111726] p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 block">TIE-BREAK</span>
                  <span className="text-xl font-bold text-[#D99A0B]">100% PUNCT</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Active Round: {activeRound?.name || 'Qualifying Sprint'}
                </span>
                <Link to="/practice" className="text-[#FB923C] hover:underline font-semibold flex items-center gap-1">
                  Try Practice Warmup <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* Rules & Competition Blueprint */}
      <section className="bg-[#F3EDE3] py-16 sm:py-24 border-y border-[#E2D9CC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#9A3412]">
              OFFICIAL EVENT SPECIFICATIONS
            </span>
            <h2 className="font-['Bricolage_Grotesque',sans-serif] font-black text-3xl sm:text-5xl text-[#1C1917] mt-2 tracking-tight">
              Competition Rules & Scoring
            </h2>
            <p className="text-sm sm:text-base text-[#5F5852] mt-3">
              Standardized competitive conditions guaranteed by the Faculty of Science & Technology.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Rule 1 */}
            <div className="rounded-3xl bg-white border border-[#E2D9CC] p-7 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#2456A6]/15 text-[#2456A6] flex items-center justify-center font-bold text-xl mb-5 font-['Bricolage_Grotesque',sans-serif]">
                01
              </div>
              <h3 className="font-['Bricolage_Grotesque',sans-serif] font-bold text-xl text-[#1C1917] mb-2">
                Fair Uniform Text
              </h3>
              <p className="text-sm text-[#3F3A36] leading-relaxed">
                In official championship rounds, every single participant receives the exact same passage chosen by organizers. Case-sensitive letters, numbers, quotes, and punctuation are verified character-by-character.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="rounded-3xl bg-white border border-[#E2D9CC] p-7 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#C2410C]/15 text-[#C2410C] flex items-center justify-center font-bold text-xl mb-5 font-['Bricolage_Grotesque',sans-serif]">
                02
              </div>
              <h3 className="font-['Bricolage_Grotesque',sans-serif] font-bold text-xl text-[#1C1917] mb-2">
                Synchronized 3-2-1 Start
              </h3>
              <p className="text-sm text-[#3F3A36] leading-relaxed">
                When the organizer triggers the round, all connected screens display a synchronized 10-second countdown using server timestamps. Everyone types at the exact same moment.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="rounded-3xl bg-white border border-[#E2D9CC] p-7 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#2F7D4F]/15 text-[#2F7D4F] flex items-center justify-center font-bold text-xl mb-5 font-['Bricolage_Grotesque',sans-serif]">
                03
              </div>
              <h3 className="font-['Bricolage_Grotesque',sans-serif] font-bold text-xl text-[#1C1917] mb-2">
                Anti-Cheat Telemetry
              </h3>
              <p className="text-sm text-[#3F3A36] leading-relaxed">
                Clipboard pasting, browser autocomplete, and simulated automated bursts (&gt;25 chars/sec) are blocked. Tab switches are logged to ensure genuine human keyboard execution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#17151F] text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-['Bricolage_Grotesque',sans-serif] font-bold text-lg text-white">
              INNOVISION 2026 — Faculty of Science & Technology
            </span>
            <p className="text-xs text-gray-400 mt-1">
              The ICFAI University, Sikkim in association with Institution’s Innovation Council (IIC).
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link to="/leaderboard" className="hover:text-[#38BDF8] transition-colors">
              Leaderboard
            </Link>
            <span>•</span>
            <Link to="/practice" className="hover:text-[#FB923C] transition-colors">
              Practice
            </Link>
            <span>•</span>
            <Link to="/admin" className="hover:text-white transition-colors">
              Organizer Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
