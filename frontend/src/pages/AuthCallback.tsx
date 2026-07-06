import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';

interface OAuthResponse {
  token:         string;
  refreshToken?: string;
  user:          Record<string, unknown>;
  isNew:         boolean;
}

/**
 * AuthCallback
 *
 * Landing page for Supabase OAuth redirect.
 * URL: /auth/callback
 *
 * Flow:
 * 1. Supabase reads the session from the URL hash automatically
 * 2. We get the access_token from the session
 * 3. POST to /api/auth/oauth/google with the access_token
 * 4. Backend verifies, creates/fetches user, returns our JWT
 * 5. Store JWT, update AuthContext, redirect
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        // Get the session Supabase set from the URL hash
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error(
            sessionError?.message ?? 'No session found. Please try signing in again.'
          );
        }

        // Exchange Supabase token for our app JWT
        const result = await api.post<OAuthResponse>(
          '/api/auth/oauth/google',
          { access_token: session.access_token }
        );

        if (cancelled) return;

        // Store our JWT the same way email login does
        api.setToken(result.token);
        if (result.refreshToken) {
          localStorage.setItem('bt_refresh_token', result.refreshToken);
        }
        localStorage.setItem('bt_user', JSON.stringify(result.user));

        // Refresh AuthContext so isPro and user are up to date
        await refreshUser();

        // Route: new user goes to onboarding, returning user goes to dashboard
        navigate(result.isNew ? '/onboarding' : '/dashboard', { replace: true });

      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
        setError(msg);
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-3xl border border-red-100 shadow-xl p-8
                        max-w-sm w-full text-center space-y-4">
          <div className="inline-flex p-4 bg-red-50 rounded-2xl">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-900">Sign-in failed</p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white
                       font-black rounded-xl transition-colors text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-5">
        <div className="bg-blue-600 p-4 rounded-2xl inline-flex">
          <GraduationCap size={32} className="text-white" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="text-blue-600 animate-spin" />
            <p className="text-sm font-black text-slate-700">
              Signing you in…
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Setting up your account
          </p>
        </div>
      </div>
    </div>
  );
}
