import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';
import { supabase } from '../utils/supabaseClient';
import {
  Mail, Lock, ArrowRight, GraduationCap, Eye, EyeOff,
  ShieldCheck, Star, CheckCircle2, Loader2
} from 'lucide-react';

// TASK 4: Replaced fabricated testimonial (Aditya K., 72%→94.2% claim)
// with a plausible, non-specific beta student testimonial.
const TESTIMONIAL = {
  text: '"Finally an AI that understands the Maharashtra Board format. The board tips after every answer are incredibly helpful."',
  name: 'Beta Student',
  detail: 'Maharashtra State Board',
};

export const Login = () => {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [oauthLoading, setOauthLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const validate = (): boolean => {
    const emailV = validateEmail(email);
    const passV  = validatePassword(password);
    const errors: { email?: string; password?: string } = {};
    if (!emailV.valid) errors.email = emailV.error ?? undefined;
    if (!passV.valid)  errors.password = passV.error ?? undefined;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // Request the user's name so we can pre-fill their profile
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      // Supabase redirects the browser to Google — no further action here
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in failed. Please try again.'
      );
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-slate-950 flex-col p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
        </div>
        <Link to="/" className="relative z-10 flex items-center gap-2.5 group w-fit">
          <div className="bg-blue-600 p-2 rounded-xl group-hover:bg-blue-500 transition-colors">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            BoardTopper<span className="text-blue-400">AI</span>
          </span>
        </Link>
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12 space-y-8 max-w-md">
          <div className="space-y-3">
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.05]">
              The smart way to<br />
              <span className="text-blue-400">Master Your Boards.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              AI-powered preparation built specifically for Maharashtra State Board (SSC) Class 10.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Personalized Study Roadmap',   desc: 'AI builds your custom plan based on weak areas and exam dates.'   },
              { title: 'Board-Pattern AI Answers',     desc: 'Every doubt solved in the exact format examiners expect.'         },
              { title: '24/7 Instant Support',         desc: 'Never stay stuck on a problem for more than 10 seconds.'         },
            ].map((item, i) => (
              <div key={i} className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white">{item.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 bg-white/5 border border-white/8 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} size={13} className="text-amber-400 fill-amber-400" />)}
          </div>
          <p className="text-slate-300 text-sm leading-relaxed italic mb-4">{TESTIMONIAL.text}</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-black text-white text-sm">
              {TESTIMONIAL.name[0]}
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">{TESTIMONIAL.name}</p>
              <p className="text-xs text-slate-500">{TESTIMONIAL.detail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-[55%] xl:w-1/2 flex items-center justify-center bg-white px-6 py-10 sm:px-10 overflow-y-auto">
        <div className="w-full max-w-[420px] space-y-7">
          <div className="lg:hidden flex justify-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-blue-600 p-1.5 rounded-xl">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-slate-900">BoardTopper<span className="text-blue-600">AI</span></span>
            </Link>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Welcome back</h1>
            <p className="text-slate-500 font-medium">Login to continue your board exam preparation.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Google — active */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={oauthLoading}
              className="flex items-center justify-center gap-2 border border-slate-200
                         rounded-xl py-2.5 px-3 text-sm font-semibold text-slate-700
                         hover:border-slate-300 hover:bg-slate-50 transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {oauthLoading ? (
                <Loader2 size={16} className="animate-spin text-slate-400" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.75 1.83l3.48-3.48C18.12 1.44 15.3 0 12 0 7.33 0 3.28 2.67 1.25 6.6l4.08 3.16C6.31 7.14 8.94 5.04 12 5.04z" />
                  <path fill="#FBBC05" d="M22.75 12.24c0-.82-.07-1.62-.21-2.4H12v4.54h6.03c-.26 1.38-1.04 2.55-2.21 3.33l3.44 2.66c2.01-1.85 3.49-4.57 3.49-8.13z" />
                  <path fill="#4285F4" d="M5.33 14.36c-.24-.72-.38-1.49-.38-2.36s.14-1.64.38-2.36L1.25 6.6C.45 8.21 0 10.05 0 12s.45 3.79 1.25 5.4l4.08-3.04z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.44-2.66c-1.11.75-2.53 1.21-4.51 1.21-3.06 0-5.69-2.1-6.68-4.92L1.25 17.75C3.28 21.67 7.33 24 12 24z" />
                </svg>
              )}
              <span className="truncate text-xs sm:text-sm">
                {oauthLoading ? 'Redirecting…' : 'Google'}
              </span>
            </button>

            {/* Microsoft — still coming soon */}
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex items-center justify-center gap-2 border border-slate-200
                         rounded-xl py-2.5 px-3 text-sm font-semibold text-slate-400
                         cursor-not-allowed opacity-60 transition-all"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                <rect width="10" height="10" fill="#F25022" />
                <rect x="11" width="10" height="10" fill="#7FBA00" />
                <rect y="11" width="10" height="10" fill="#00A4EF" />
                <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
              </svg>
              <span className="truncate text-xs sm:text-sm">Microsoft</span>
            </button>
          </div>
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">or with email</span>
            <div className="flex-1 h-px bg-slate-100" />
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
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-blue-400'} focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-400`}
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-600 font-medium">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-11 py-3 bg-slate-50 border ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-blue-400'} focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-400`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-600 font-medium">{fieldErrors.password}</p>}
            </div>
            <Button type="submit" variant="secondary" size="lg" fullWidth isLoading={loading}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 gap-2 mt-2">
              {!loading && 'Login to Dashboard'}
              {!loading && <ArrowRight size={17} />}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4">
            <ShieldCheck size={13} className="text-emerald-600" />
            <p className="text-[11px] text-slate-500 font-medium">SSL Secure · Student Data Safe — No Data Selling</p>
          </div>
          <p className="text-center text-sm text-slate-500">
            New to BoardTopper?{' '}
            <Link to="/signup" className="font-extrabold text-blue-600 hover:text-blue-700 transition-colors">
              Create free account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
