'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Session } from './types';
import { fetchSession, login as storeLogin, logout as storeLogout } from './store';
import { isSupabaseConfigured } from './supabase';

interface SessionContextValue {
  session: Session | null;
  /** True until the initial session check completes. */
  loading: boolean;
  /** True when a backend exists and passcodes are actually enforced. */
  serverMode: boolean;
  login: (slug: string, passcode: string) => Promise<Session>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverMode, setServerMode] = useState(false);

  useEffect(() => {
    setServerMode(isSupabaseConfigured());
    fetchSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (slug: string, passcode: string) => {
    const s = await storeLogin(slug, passcode);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(async () => {
    await storeLogout();
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, serverMode, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
