import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Flame, LogOut, Shield, User, Play, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
export const Navbar: React.FC = () => {
  const location = useLocation();
  const { participant, clearParticipantSession } = useAuth();
  const { config, activeRound } = useCompetition();
  const getStatusBadge = () => {
    const isDurationOver = Boolean(
      activeRound?.startAt &&
      activeRound?.duration &&
      Date.now() >= (Number(activeRound.startAt) + activeRound.duration * 1000)
    );

    if (config.status === 'finished' || activeRound?.status === 'completed' || isDurationOver) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#1C1917]/10 text-[#5F5852] border border-[#E2D9CC]">
          Race Completed
        </span>
      );
    }

    switch (config.status) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C2412D]/15 text-[#9B2C1C] border border-[#C2412D]/30">
            <span className="w-2 h-2 rounded-full bg-[#C2412D] animate-ping" />
            Live Race In Progress
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D99A0B]/20 text-[#7C2D12] border border-[#D99A0B]/40">
            <span className="w-2 h-2 rounded-full bg-[#D99A0B]" />
            Lobby Active • Waiting
          </span>
        );
      case 'registration_open':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2F7D4F]/15 text-[#24603D] border border-[#2F7D4F]/30">
            <span className="w-2 h-2 rounded-full bg-[#2F7D4F]" />
            Registration Open
          </span>
        );
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-[#FBF8F3]/95 backdrop-blur-md border-b border-[#E2D9CC] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand & Logo */}
        <Link to="/" className="flex items-center gap-3.5 group text-decoration-none">
          <div className="w-10 h-10 rounded-xl bg-[#C2410C] group-hover:bg-[#9A3412] text-white font-['Bricolage_Grotesque',sans-serif] font-black text-xl flex items-center justify-center shadow-sm shadow-[#C2410C]/20 transition-all transform group-hover:scale-105">
            IV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Bricolage_Grotesque',sans-serif] font-extrabold text-xl tracking-tight text-[#1C1917]">
                INNOVISION <span className="text-[#C2410C]">2026</span>
              </span>
              <span className="hidden md:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FDE3D0] text-[#7C2D12] uppercase tracking-wider">
                IIC • FST
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#5F5852] -mt-0.5 hidden sm:block">
              The ICFAI University, Sikkim
            </p>
          </div>
        </Link>

        {/* Status pill (Desktop) */}
        <div className="hidden lg:flex items-center">
          {getStatusBadge()}
        </div>

        {/* Nav Links & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/arena"
            className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/arena')
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'text-[#3F3A36] hover:bg-[#F3EDE3]'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-[#FB923C]" />
            <span>Race Arena</span>
          </Link>

          <Link
            to="/leaderboard"
            className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/leaderboard')
                ? 'bg-[#17151F] text-[#38BDF8] border border-[#38BDF8]/40 shadow-xs'
                : 'text-[#3F3A36] hover:bg-[#F3EDE3]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#D99A0B]" />
            <span>Leaderboard</span>
          </Link>

          <Link
            to="/practice"
            className={`hidden sm:flex px-3.5 py-2 rounded-full text-sm font-semibold transition-colors items-center gap-1.5 ${
              isActive('/practice')
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'text-[#3F3A36] hover:bg-[#F3EDE3]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#2F7D4F]" />
            <span>Practice</span>
          </Link>

          {/* Admin link */}
          <Link
            to="/admin"
            className={`p-2 rounded-full text-sm font-semibold transition-colors flex items-center justify-center ${
              isActive('/admin')
                ? 'bg-[#C2410C] text-white shadow-xs'
                : 'text-[#5F5852] hover:bg-[#F3EDE3] hover:text-[#1C1917]'
            }`}
            title="Organizer Portal"
            aria-label="Organizer portal"
          >
            <Shield className="w-4 h-4" />
          </Link>

          {/* Participant Profile State */}
          {participant ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E2D9CC]">
              <div className="w-8 h-8 rounded-full bg-[#1C1917] text-white flex items-center justify-center text-xs font-bold font-mono">
                {(participant.name || 'P')[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-bold text-[#1C1917] truncate max-w-[120px]">
                  {participant.name}
                </p>
                <p className="text-[10px] text-[#5F5852] font-mono truncate max-w-[120px]">
                  {participant.rollNo}
                </p>
              </div>
              <button
                onClick={() => clearParticipantSession()}
                className="p-1.5 text-[#5F5852] hover:text-[#C2412D] hover:bg-[#F3EDE3] rounded-full transition-colors cursor-pointer"
                title="Switch Participant"
                aria-label="Switch Participant"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <User className="w-3.5 h-3.5 text-white" />
              <span>Join Race</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
