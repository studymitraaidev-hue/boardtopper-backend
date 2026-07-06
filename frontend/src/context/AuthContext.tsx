import React, {
  createContext, useContext, useState, useEffect, ReactNode,
} from 'react';
import { api } from '../utils/api';
import { fetchSubscriptionStatus, SubscriptionStatus } from '../services/paymentService';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  // DAY 2: Only 'maharashtra' board is supported.
  board: 'maharashtra';
  language: 'english' | 'marathi' | 'hindi' | 'semi';
  targetPercent: number;
  weakSubjects: string[];
  examDate: string | null;   // ISO date 'YYYY-MM-DD' or null
  avatar?: string;
  emailVerified: boolean;
  onboardingComplete?: boolean;
  emergencyTrialUsed?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * DAY 9: Server-verified subscription state.
   */
  subscriptionStatus: SubscriptionStatus | null;
  /** True only when backend confirms an active Pro subscription */
  isPro: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
  updateUser(partial: Partial<AuthUser>): void;
  refreshUser(): Promise<void>;
  /** Re-fetches subscription status from backend. Call after payment. */
  refreshSubscription(): Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function mapUser(raw: Record<string, unknown>): AuthUser {
  return {
    id:            raw['id'] as string,
    name:          raw['name'] as string,
    email:         raw['email'] as string,
    plan:          raw['plan'] as 'free' | 'pro',
    board:         (raw['board'] as 'maharashtra') ?? 'maharashtra',
    language:      (raw['language'] as AuthUser['language']) ?? 'english',
    targetPercent: (raw['targetPercent'] as number) ?? 90,
    weakSubjects:  (raw['weakSubjects'] as string[]) ?? [],
    examDate:      (raw['examDate'] as string | null) ?? null,
    avatar:        raw['avatar'] as string | undefined,
    emailVerified: (raw['emailVerified'] ?? raw['email_verified'] ?? false) as boolean,
  };
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  async function fetchSubscription(): Promise<void> {
    try {
      const status = await fetchSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const raw = localStorage.getItem('bt_user');
        const token = localStorage.getItem('bt_token');

        if (!raw || !token) {
          setIsLoading(false);
          return;
        }

        setUser(JSON.parse(raw) as AuthUser);

        try {
          const result = await api.get<{ user: Record<string, unknown> }>('/api/auth/me');
          const freshUser = mapUser(result.user);
          localStorage.setItem('bt_user', JSON.stringify(freshUser));
          setUser(freshUser);
          await fetchSubscription();
        } catch {
          localStorage.removeItem('bt_token');
          localStorage.removeItem('bt_user');
          setUser(null);
          setSubscriptionStatus(null);
        }
      } catch {
        localStorage.removeItem('bt_user');
        localStorage.removeItem('bt_token');
        setUser(null);
        setSubscriptionStatus(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const data = await api.post<{ token: string; refreshToken?: string; user: Record<string, unknown> }>(
      '/api/auth/login',
      { email, password }
    );
    api.setToken(data.token);
    localStorage.setItem('bt_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('bt_refresh_token', data.refreshToken);
    }
    const mappedUser = mapUser(data.user);
    localStorage.setItem('bt_user', JSON.stringify(mappedUser));
    setUser(mappedUser);
    await fetchSubscription();
  }

  async function register(name: string, email: string, password: string): Promise<void> {
    const data = await api.post<{ token: string; refreshToken?: string; user: Record<string, unknown> }>(
      '/api/auth/register',
      { name, email, password }
    );
    api.setToken(data.token);
    localStorage.setItem('bt_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('bt_refresh_token', data.refreshToken);
    }
    const mappedUser = mapUser(data.user);
    localStorage.setItem('bt_user', JSON.stringify(mappedUser));
    setUser(mappedUser);
    await fetchSubscription();
  }

  function logout(): void {
    api.post('/api/auth/logout', {}).catch(() => {});
    api.setToken(null);
    localStorage.removeItem('bt_user');
    localStorage.removeItem('bt_refresh_token');
    setUser(null);
    setSubscriptionStatus(null);
  }

  function updateUser(partial: Partial<AuthUser>): void {
    if (!user) return;
    const updated = { ...user, ...partial };
    localStorage.setItem('bt_user', JSON.stringify(updated));
    setUser(updated);
  }

  async function refreshUser(): Promise<void> {
    try {
      const result = await api.get<{ user: Record<string, unknown> }>('/api/auth/me');
      const freshUser = mapUser(result.user);
      localStorage.setItem('bt_user', JSON.stringify(freshUser));
      setUser(freshUser);
    } catch {
      // Non-fatal
    }
  }

  async function refreshSubscription(): Promise<void> {
    await fetchSubscription();
  }

  const isPro = subscriptionStatus?.isPro === true || user?.plan === 'pro';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        subscriptionStatus,
        isPro,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

