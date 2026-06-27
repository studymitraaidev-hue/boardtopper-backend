import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../utils/api';
import { cancelSubscription } from '../services/paymentService';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import {
  User, Mail, Lock, Crown, Trash2, ChevronRight, CheckCircle2,
  AlertCircle, Eye, EyeOff, Shield, Calendar, Target, BookOpen, Globe2, X,
  Monitor,
} from 'lucide-react';

// â”€â”€â”€ Shared input styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

// â”€â”€â”€ Section card wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden', className)}>
      {children}
    </div>
  );
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Settings() {
  const { user, updateUser, subscriptionStatus, refreshSubscription } = useAuth();

  // Google OAuth detection
  const isGoogleUser = !!(user?.avatar && user.avatar.includes('googleusercontent.com'));

  // â”€â”€ Section 1: Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [nameValue, setNameValue] = useState(user?.name ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  async function handleSaveProfile() {
    if (!nameValue.trim()) return;
    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      await api.patch('/api/auth/me', { name: nameValue.trim() });
      updateUser({ name: nameValue.trim() });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong.';
      setProfileError(msg);
      setTimeout(() => setProfileError(null), 5000);
    } finally {
      setProfileLoading(false);
    }
  }

  // â”€â”€ Section 2: Exam Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [langValue, setLangValue] = useState<string>(user?.language ?? 'english');
  const [targetValue, setTargetValue] = useState<number>(user?.targetPercent ?? 90);
  const [weakSubjectsValue, setWeakSubjectsValue] = useState<string[]>(user?.weakSubjects ?? []);
  const [examDateValue, setExamDateValue] = useState(user?.examDate ?? '');
  const [examSetupLoading, setExamSetupLoading] = useState(false);
  const [examSetupSuccess, setExamSetupSuccess] = useState(false);
  const [examSetupError, setExamSetupError] = useState<string | null>(null);

  function toggleWeakSubject(subject: string) {
    setWeakSubjectsValue((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }

  async function handleSaveExamSetup() {
    setExamSetupLoading(true);
    setExamSetupSuccess(false);
    setExamSetupError(null);
    try {
      await api.patch('/api/auth/me', {
        language: langValue,
        targetPercent: targetValue,
        weakSubjects: weakSubjectsValue,
        examDate: examDateValue || null,
      });
      updateUser({
        language: langValue as 'english' | 'marathi' | 'hindi' | 'semi',
        targetPercent: targetValue,
        weakSubjects: weakSubjectsValue,
        examDate: examDateValue || null,
      });
      setExamSetupSuccess(true);
      setTimeout(() => setExamSetupSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong.';
      setExamSetupError(msg);
      setTimeout(() => setExamSetupError(null), 5000);
    } finally {
      setExamSetupLoading(false);
    }
  }

  // â”€â”€ Section 3: Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  async function handleChangePassword() {
    setSecurityError(null);
    setSecuritySuccess(false);

    if (newPassword.length < 8) {
      setSecurityError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('Passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setSecurityError('New password must be different.');
      return;
    }

    setSecurityLoading(true);
    try {
      await api.patch('/api/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecuritySuccess(true);
      setTimeout(() => setSecuritySuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong.';
      setSecurityError(msg);
      setTimeout(() => setSecurityError(null), 5000);
    } finally {
      setSecurityLoading(false);
    }
  }

  // â”€â”€ Section 4: Subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => { refreshSubscription(); }, []);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError]     = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  async function handleCancelSubscription() {
    setCancelLoading(true);
    setCancelError(null);
    setCancelSuccess(false);
    try {
      await cancelSubscription();
      setCancelSuccess(true);
      await refreshSubscription();
    } catch (err) {
      if (err instanceof ApiError) {
        setCancelError(err.message);
      } else {
        setCancelError('Failed to cancel subscription. Please try again.');
      }
    } finally {
      setCancelLoading(false);
    }
  }

  // â”€â”€ Section 5: Danger Zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteToast, setDeleteToast] = useState(false);

  function handleDeleteConfirm() {
    setDeleteToast(true);
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    setTimeout(() => setDeleteToast(false), 4000);
  }

  // â”€â”€ Section 4b: Active Sessions (DAY 38) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sessions, setSessions] = useState<Array<{
    id: string; deviceName: string; lastSeen: string;
    createdAt: string; expiresAt: string;
  }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    api.get<Array<{ id: string; deviceName: string; lastSeen: string; createdAt: string; expiresAt: string }>>('/api/auth/sessions')
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleRevokeSession(sessionId: string) {
    try {
      await api.delete(`/api/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // silently ignore â€” user can retry
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const languages = [
    { id: 'english', label: 'English' },
    { id: 'marathi', label: 'Marathi' },
    { id: 'hindi',   label: 'Hindi' },
    { id: 'semi',    label: 'Semi-English' },
  ];

  const targetOptions = [
    { value: 75, label: '75%', sublabel: 'Pass'        },
    { value: 85, label: '85%', sublabel: 'First Class' },
    { value: 90, label: '90%', sublabel: 'Distinction' },
    { value: 95, label: '95%', sublabel: 'Topper'      },
  ];

  const allSubjects = [
    'Mathematics', 'Science', 'Social Science',
    'English', 'Sanskrit', 'Marathi', 'Hindi',
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">

          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-900">Account Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your profile, exam setup, and account.</p>
          </div>

          <div className="flex flex-col gap-6">

            {/* â”€â”€ SECTION 1: PROFILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <User size={18} className="text-blue-600" />
                <h2 className="font-bold text-base text-slate-900">Profile</h2>
              </div>
              <div className="px-6 py-5 space-y-4">

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className={inputClass}
                    placeholder="Your full name"
                  />
                </div>

                {/* Email â€” disabled */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className={cn(inputClass, 'bg-slate-50 text-slate-400 cursor-not-allowed')}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    To change your email address, contact support.
                  </p>
                </div>

                {/* Save + feedback */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={profileLoading}
                    onClick={handleSaveProfile}
                  >
                    Save Profile
                  </Button>
                  {profileSuccess && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Profile updated.
                    </span>
                  )}
                  {profileError && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={13} /> {profileError}
                    </span>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* â”€â”€ SECTION 2: EXAM SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <Target size={18} className="text-emerald-600" />
                <h2 className="font-bold text-base text-slate-900">Exam Setup</h2>
              </div>
              <div className="px-6 py-5 space-y-5">

                {/* Language */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Medium of Study</label>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setLangValue(lang.id)}
                        className={
                          langValue === lang.id
                            ? 'border-2 border-blue-600 bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-semibold'
                            : 'border-2 border-slate-200 bg-white text-slate-600 rounded-xl px-4 py-2 text-sm font-semibold hover:border-slate-300'
                        }
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Percent */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Target Percentage</label>
                  <div className="flex flex-wrap gap-2">
                    {targetOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTargetValue(opt.value)}
                        className={
                          targetValue === opt.value
                            ? 'border-2 border-blue-600 bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-semibold'
                            : 'border-2 border-slate-200 bg-white text-slate-600 rounded-xl px-4 py-2 text-sm font-semibold hover:border-slate-300'
                        }
                      >
                        {opt.label} <span className="text-xs opacity-70">{opt.sublabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weak Subjects */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Weak Subjects (select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {allSubjects.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => toggleWeakSubject(subject)}
                        className={
                          weakSubjectsValue.includes(subject)
                            ? 'border-2 border-amber-500 bg-amber-50 text-amber-700 rounded-xl px-3 py-1.5 text-sm font-semibold'
                            : 'border-2 border-slate-200 bg-white text-slate-600 rounded-xl px-3 py-1.5 text-sm font-semibold hover:border-slate-300'
                        }
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exam Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Exam Date</label>
                  <input
                    type="date"
                    value={examDateValue}
                    onChange={(e) => setExamDateValue(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Save + feedback */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={examSetupLoading}
                    onClick={handleSaveExamSetup}
                  >
                    Save Exam Setup
                  </Button>
                  {examSetupSuccess && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Exam setup updated.
                    </span>
                  )}
                  {examSetupError && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={13} /> {examSetupError}
                    </span>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* â”€â”€ SECTION 3: SECURITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <Shield size={18} className="text-violet-600" />
                <h2 className="font-bold text-base text-slate-900">Security</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                {isGoogleUser ? (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <Lock size={16} className="text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-500">You signed in with Google â€” no password to change.</p>
                  </div>
                ) : (
                  <>
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={cn(inputClass, 'pr-10')}
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password (min 8 characters)</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={cn(inputClass, 'pr-10')}
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={cn(inputClass, 'pr-10')}
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Save + feedback */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={securityLoading}
                        onClick={handleChangePassword}
                      >
                        Change Password
                      </Button>
                      {securitySuccess && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Password changed successfully.
                        </span>
                      )}
                      {securityError && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={13} /> {securityError}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </SectionCard>

            {/* â”€â”€ SECTION 3b: ACTIVE SESSIONS (DAY 38) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <Monitor size={18} className="text-blue-600" />
                <h2 className="font-bold text-base text-slate-900">Active Sessions</h2>
              </div>
              <div className="px-6 py-5 space-y-3">
                {sessionsLoading ? (
                  <div className="space-y-2">
                    <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="h-12 bg-slate-100 rounded-xl animate-pulse w-4/5" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-slate-500">No active sessions found.</p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {session.deviceName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Last active:{' '}
                          {new Date(session.lastSeen).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <X size={12} />
                        Revoke
                      </button>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            {/* â”€â”€ SECTION 4: SUBSCRIPTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <Crown size={18} className="text-amber-500" />
                <h2 className="font-bold text-base text-slate-900">Subscription</h2>
              </div>
              <div className="px-6 py-5">
                {subscriptionStatus === null ? (
                  /* Loading skeleton */
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                  </div>
                ) : (subscriptionStatus.isPro || user?.plan === 'pro') ? (
                  /* Pro user */
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1 text-xs font-bold">
                      Topper Pro âœ¦ Active
                    </span>
                    <p className="text-sm text-slate-600 mt-2">
                      Your Pro access renews on{' '}
                      {new Date(subscriptionStatus?.subscription?.endsAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}.
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                      >
                        {cancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
                      </Button>
                      {cancelSuccess && (
                        <p className="text-xs text-emerald-600 mt-2">
                          Cancellation confirmed. Your Pro access continues until the end of your billing period.
                        </p>
                      )}
                      {cancelError && (
                        <p className="text-xs text-red-600 mt-2">
                          {cancelError}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Free user */
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">You are on the Free Plan.</p>
                    <Link to="/pricing">
                      <Button variant="secondary" size="sm">Upgrade to Pro â†’</Button>
                    </Link>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* â”€â”€ SECTION 5: DANGER ZONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-red-50 flex items-center gap-3">
                <Trash2 size={18} className="text-red-500" />
                <h2 className="font-bold text-base text-red-700">Danger Zone</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-slate-600">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Account
                </Button>
                {deleteToast && (
                  <p className="text-xs text-slate-500 mt-2">
                    Request sent. Our team will process this within 24 hours.
                  </p>
                )}
              </div>
            </div>

          </div>{/* end gap-6 column */}
        </div>{/* end max-w-2xl */}
      </div>{/* end min-h-screen */}

      {/* â”€â”€ DELETE CONFIRMATION MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-black text-slate-900 mb-2">Delete Account?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will permanently delete your account and all your notes, progress, and conversations.
              This cannot be undone. Type <span className="font-mono font-bold">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono mb-5"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={handleDeleteConfirm}
              >
                Yes, Delete My Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}



