import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CompetitionProvider } from './context/CompetitionContext';
import { Navbar } from './components/common/Navbar';
import { PhysicalKeyboardNotice } from './components/common/PhysicalKeyboardNotice';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { ArenaPage } from './pages/ArenaPage';
import { PracticePage } from './pages/PracticePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminPage } from './pages/AdminPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CompetitionProvider>
          <div className="min-h-screen flex flex-col bg-[#FBF8F3] text-[#1C1917] selection:bg-[#FDE3D0]">
            {/* Top hardware recommendation notice for mobile/touch screens */}
            <PhysicalKeyboardNotice />

            {/* Standardized Navigation Header */}
            <Navbar />

            {/* App Routes */}
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/arena" element={<ArenaPage />} />
                <Route path="/lobby" element={<ArenaPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </CompetitionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
