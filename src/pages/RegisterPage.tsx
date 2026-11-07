import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Hash, BookOpen, Calendar, Phone, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import { MagneticButton } from '../components/common/MagneticButton';
import { Reveal } from '../components/common/Reveal';

const DEPARTMENTS = [
  'Computer Science & Engineering (CSE)',
  'Artificial Intelligence & Data Science (AI & DS)',
  'Information Technology (IT)',
  'Civil Engineering',
  'Mechanical Engineering',
  'Basic Sciences & Humanities',
  'Management Studies (FMS)',
  'Others',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Post Graduate (PG)'];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { participant, registerParticipant, clearParticipantSession } = useAuth();
  const { refreshAllData, addParticipantOptimistic } = useCompetition();

  const isExistingCustom =
    Boolean(participant?.department) &&
    !DEPARTMENTS.slice(0, -1).includes(participant?.department || '');

  const [formData, setFormData] = useState({
    name: participant?.name || '',
    email: participant?.email || '',
    rollNo: participant?.rollNo || '',
    department: isExistingCustom ? 'Others' : (participant?.department || DEPARTMENTS[0]),
    customDepartment: isExistingCustom
      ? (participant?.department || '').replace(/^Others\s*\((.*)\)$/, '$1').replace(/^Others$/, '')
      : '',
    year: participant?.year || YEARS[2], // default 3rd year
    phone: participant?.phone || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.rollNo.trim()) errs.rollNo = 'Roll / registration number is required';
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = 'Valid institutional or personal email is required';
    }
    if (!formData.phone.trim() || formData.phone.length < 8) {
      errs.phone = 'Valid mobile / WhatsApp number is required (min 8 digits)';
    }
    if (formData.department === 'Others' && !formData.customDepartment.trim()) {
      errs.customDepartment = 'Please specify your department or program name';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      setSubmitError('Please complete all required fields indicated in red below.');
      return;
    }

    try {
      setSubmitting(true);

      const resolvedDepartment =
        formData.department === 'Others'
          ? (formData.customDepartment.trim() ? `Others (${formData.customDepartment.trim()})` : 'Others')
          : formData.department;

      const newP = await registerParticipant({
        name: formData.name.trim(),
        email: formData.email.trim(),
        rollNo: formData.rollNo.trim(),
        department: resolvedDepartment,
        year: formData.year,
        phone: formData.phone.trim(),
      });

      // Optimistically update competition context state instantly
      addParticipantOptimistic(newP);

      // Trigger roster sync non-blockingly
      refreshAllData().catch(() => {});

      // Route immediately into race arena
      navigate('/arena');
    } catch (err: any) {
      console.error('Registration error:', err);
      setSubmitError(err?.message || 'Registration encountered an issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#FBF8F3] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <Reveal delay={0.1}>
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9A3412]">
              INNOVISION 2026 COMPETITOR BADGE
            </span>
            <h1 className="font-['Bricolage_Grotesque',sans-serif] font-black text-3xl sm:text-4xl text-[#1C1917] mt-1">
              Participant Registration
            </h1>
            <p className="text-sm text-[#5F5852] mt-2">
              Fill in your details below to receive your official competition badge and join the Live Typing Arena.
            </p>
          </div>
        </Reveal>

        {/* Existing registration indicator with quick continue or switch option */}
        {participant && (
          <Reveal delay={0.15}>
            <div className="rounded-3xl bg-white border border-[#2F7D4F]/30 p-5 sm:p-6 shadow-sm mb-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[#2F7D4F]/15 text-[#2F7D4F] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#2F7D4F] uppercase tracking-wider">
                Active Competitor Registered on this Device
              </p>
              <h2 className="text-lg font-bold text-[#1C1917] mt-1">
                {participant.name} ({participant.rollNo})
              </h2>
              <p className="text-xs text-[#5F5852] mt-0.5">
                {participant.department} • {participant.year}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  to="/arena"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-xs shadow-md transition-all"
                >
                  <span>Enter Race Arena</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => clearParticipantSession()}
                  className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[#1C1917] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Register New Participant
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* Direct Participant Registration Form - ZERO GOOGLE LOGIN REQUIRED */}
        <Reveal delay={0.2}>
          <div className="rounded-3xl bg-white border border-[#E2D9CC] p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Manish Kumar"
                    className={`w-full rounded-xl bg-white border pl-10 pr-4 py-3 text-sm text-[#1C1917] placeholder:text-gray-400 focus:outline-none transition-colors ${
                      errors.name ? 'border-rose-500 focus:border-rose-600' : 'border-gray-200 focus:border-[#1C1917]'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.name}
                  </p>
                )}
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1.5">
                  Roll / Registration Number *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.rollNo}
                    onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                    placeholder="e.g. 23ST042"
                    className={`w-full rounded-xl bg-white border pl-10 pr-4 py-3 text-sm text-[#1C1917] placeholder:text-gray-400 focus:outline-none transition-colors ${
                      errors.rollNo ? 'border-rose-500 focus:border-rose-600' : 'border-gray-200 focus:border-[#1C1917]'
                    }`}
                  />
                </div>
                {errors.rollNo && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.rollNo}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1.5">
                  Institutional / Personal Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. participant@icfai.edu"
                    className={`w-full rounded-xl bg-white border pl-10 pr-4 py-3 text-sm text-[#1C1917] placeholder:text-gray-400 focus:outline-none transition-colors ${
                      errors.email ? 'border-rose-500 focus:border-rose-600' : 'border-gray-200 focus:border-[#1C1917]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email}
                  </p>
                )}
              </div>

              {/* Department / Program Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1.5">
                  Department / Program *
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <select
                    value={formData.department}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        department: e.target.value,
                        // keep customDepartment if switching back to Others
                      });
                      if (errors.customDepartment) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.customDepartment;
                          return n;
                        });
                      }
                    }}
                    className="w-full rounded-xl bg-white border border-gray-200 pl-10 pr-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917] transition-colors cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Others Program Custom Input */}
                {formData.department === 'Others' && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#FFF8F3] border border-[#FDBA74]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#9A3412] uppercase tracking-wider">
                        Specify Your Degree / Program *
                      </label>
                      <span className="text-[10px] font-mono text-[#C2410C] font-semibold">Custom Department</span>
                    </div>
                    <input
                      type="text"
                      value={formData.customDepartment}
                      onChange={e => {
                        setFormData({ ...formData, customDepartment: e.target.value });
                        if (errors.customDepartment) {
                          setErrors(prev => {
                            const n = { ...prev };
                            delete n.customDepartment;
                            return n;
                          });
                        }
                      }}
                      placeholder="e.g. BCA, MCA, Electrical, Biotechnology, BBA, B.Com, etc."
                      className={`w-full rounded-xl bg-white border px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-gray-400 focus:outline-none transition-colors ${
                        errors.customDepartment
                          ? 'border-rose-500 focus:border-rose-600 ring-1 ring-rose-500/20'
                          : 'border-[#FDBA74] focus:border-[#C2410C]'
                      }`}
                    />
                    {errors.customDepartment ? (
                      <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.customDepartment}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[#7C2D12]">
                        This program name will be recorded on your official competitor badge and leaderboard record.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1.5">
                  Academic Year *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <select
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                    className="w-full rounded-xl bg-white border border-gray-200 pl-10 pr-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917] transition-colors appearance-none cursor-pointer"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mobile / WhatsApp Number */}
              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1.5">
                  Mobile / WhatsApp Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className={`w-full rounded-xl bg-white border pl-10 pr-4 py-3 text-sm text-[#1C1917] placeholder:text-gray-400 focus:outline-none transition-colors ${
                      errors.phone ? 'border-rose-500 focus:border-rose-600' : 'border-gray-200 focus:border-[#1C1917]'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.phone}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <MagneticButton
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-sm shadow-lg shadow-[#C2410C]/20 transition-all btn-shimmer-sweep cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Registering Participant & Entering Arena...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration & Join Arena</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </MagneticButton>
              </div>
            </form>
          </div>
        </Reveal>
      </div>
    </div>
  );
};
