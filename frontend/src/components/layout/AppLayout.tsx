import { ReactNode, useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex bg-slate-50 min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden animate-slide-right">
          <Sidebar className="!flex w-full h-full" />
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-y-auto h-screen flex flex-col pb-16 md:pb-0">
        {/* Email verification banner */}
        {user && !user.emailVerified && !bannerDismissed && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-amber-800 font-medium">
              {resendSent
                ? '✓ Verification email sent — check your inbox.'
                : 'Please verify your email address to secure your account.'}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {!resendSent && (
                <button
                  disabled={resendLoading}
                  onClick={async () => {
                    setResendLoading(true);
                    try {
                      await api.post('/api/auth/resend-verification', {});
                      setResendSent(true);
                    } catch {
                      /* silent fail */
                    } finally {
                      setResendLoading(false);
                    }
                  }}
                  className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 disabled:opacity-50"
                >
                  {resendLoading ? 'Sending…' : 'Resend link'}
                </button>
              )}
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-xs text-amber-600 hover:text-amber-900 font-bold"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-center gap-2">
            <span className="text-sm">📵</span>
            <p className="text-xs font-medium">
              You are offline. Some features need internet. Your notes and syllabus are available.
            </p>
          </div>
        )}

        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 h-14 flex items-center md:hidden">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
        </div>
        {children}
      </main>
      {/* Bottom navigation — mobile only, hidden on md+ */}
      <BottomNav />
    </div>
  );
}
