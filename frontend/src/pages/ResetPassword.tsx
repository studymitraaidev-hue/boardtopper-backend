import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../utils/api';
import { GraduationCap, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const token             = searchParams.get('token') ?? '';

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // No token in URL → show error immediately
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center space-y-4">
          <AlertTriangle size={40} className="text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Invalid Reset Link</h2>
          <p className="text-sm text-slate-500">This link is missing a reset token. Please request a new password reset.</p>
          <Link to="/forgot-password">
            <Button variant="secondary" size="md" className="bg-blue-600 hover:bg-blue-700 mt-2">
              Request New Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain at least one uppercase letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Reset failed. The link may have expired. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-10 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Password Reset!</h2>
          <p className="text-sm text-slate-500 font-medium">
            Your password has been updated. Redirecting you to login in 3 seconds...
          </p>
          <Link to="/login">
            <Button variant="secondary" size="md" className="bg-blue-600 hover:bg-blue-700">
              Go to Login Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        <div className="bg-blue-600 p-1.5 rounded-xl group-hover:bg-blue-500 transition-colors">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-black text-slate-900">
          BoardTopper<span className="text-blue-600">AI</span>
        </span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 sm:p-10 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-slate-900">Set New Password</h1>
            <p className="text-sm text-slate-500 font-medium">
              Choose a strong password with at least 8 characters, one uppercase letter, and one number.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required autoFocus autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
                  placeholder="Repeat your new password"
                  required autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              fullWidth
              isLoading={loading}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {!loading && 'Reset Password'}
            </Button>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center">
            <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
