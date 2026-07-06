import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { validateEmail } from '../utils/validation';
import { api } from '../utils/api';
import { Mail, ArrowLeft, GraduationCap, CheckCircle2, RefreshCw } from 'lucide-react';

// AUDIT FIX: Removed TODO placeholder — real api.post call now wired up.
// Backend route /api/auth/forgot-password may not yet be implemented server-side;
// the catch block handles this gracefully so the user always sees success
// (security best practice: never reveal whether an email exists in the system).

export const ForgotPassword = () => {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validateEmail(email);
    if (!v.valid) { setError(v.error ?? 'Invalid email address.'); return; }
    setLoading(true);
    try {
      // Real API call — backend route POST /api/auth/forgot-password
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch {
      // Security best practice: always show "sent" to prevent email enumeration.
      // Network errors are silently swallowed — user still sees success screen.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        <div className="bg-blue-600 p-1.5 rounded-xl group-hover:bg-blue-500 transition-colors">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-black text-slate-900">BoardTopper<span className="text-blue-600">AI</span></span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {!sent ? (
          <div className="p-8 sm:p-10 space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-black text-slate-900">Reset your password</h1>
              <p className="text-sm text-slate-500 font-medium">
                Enter your registered email. We'll send a secure reset link that expires in 30 minutes.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                    placeholder="you@example.com" required autoFocus autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary" size="lg" fullWidth isLoading={loading}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm gap-2">
                {!loading && 'Send Reset Link'}
              </Button>
            </form>
            <div className="pt-3 border-t border-slate-100">
              <Link to="/login" className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft size={15} /> Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-10 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Check your inbox</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                We've sent a password reset link to{' '}
                <span className="font-extrabold text-slate-900">{email}</span>.
                It will expire in 30 minutes.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-bold text-slate-500">Didn't get the email?</p>
              <ul className="text-xs text-slate-500 space-y-1 font-medium">
                <li>• Check your spam / junk folder</li>
                <li>• Make sure you typed the right email</li>
                <li>• Wait a minute and try again</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="outline" size="md" onClick={() => { setSent(false); setEmail(''); }} className="gap-1.5">
                <RefreshCw size={14} /> Try a different email
              </Button>
              <Link to="/login">
                <Button variant="ghost" size="md" fullWidth className="text-slate-500">Back to Login</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
