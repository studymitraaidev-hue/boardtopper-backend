import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('This link is invalid or has expired.');
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid verification link.');
      return;
    }

    api.get<{ message: string }>(`/api/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        setStatus('error');
        if (err instanceof Error) setErrorMsg(err.message);
      });
  }, [token]);

  async function handleResend() {
    setResendLoading(true);
    try {
      await api.post('/api/auth/resend-verification', {});
      setResendSent(true);
    } catch {
      // silent
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Email Verified!</h1>
            <p className="text-slate-500 mb-6">
              Your email has been verified. You can now use all features.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors w-full"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✕</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Verification Failed</h1>
            <p className="text-slate-500 mb-6">{errorMsg}</p>
            {resendSent ? (
              <p className="text-green-600 font-medium text-sm">✓ Check your inbox.</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors w-full"
              >
                {resendLoading ? 'Sending…' : 'Resend Verification Email'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
