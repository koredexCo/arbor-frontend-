import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Double-gated development-only auth bypass:
// 1. Must be in Vite development mode (import.meta.env.DEV === true, statically false in production builds)
// 2. Must have explicit VITE_DEV_AUTH_BYPASS === 'true' in .env
const isDevAuthBypass =
  Boolean(import.meta.env.DEV) && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

const DEV_USER: User = {
  id: '00000000-0000-0000-0000-000000000000',
  app_metadata: { provider: 'dev' },
  user_metadata: { name: 'Development User' },
  aud: 'authenticated',
  confirmation_sent_at: '2026-01-01T00:00:00.000Z',
  recovery_sent_at: '2026-01-01T00:00:00.000Z',
  email_change_sent_at: '2026-01-01T00:00:00.000Z',
  new_email: '',
  invited_at: '2026-01-01T00:00:00.000Z',
  action_link: '',
  email: 'dev@example.com',
  phone: '',
  created_at: '2026-01-01T00:00:00.000Z',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone_confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  role: 'authenticated',
  updated_at: '2026-01-01T00:00:00.000Z',
  identities: [],
  factors: [],
};

const DEV_SESSION: Session = {
  access_token: 'dev-local-session-token',
  token_type: 'bearer',
  user: DEV_USER,
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  refresh_token: 'dev-refresh-token',
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(() => {
    if (isDevAuthBypass) return DEV_SESSION;
    return null;
  });
  const [user, setUser] = useState<User | null>(() => {
    if (isDevAuthBypass) return DEV_USER;
    return null;
  });
  const [loading, setLoading] = useState(!isDevAuthBypass);

  useEffect(() => {
    if (isDevAuthBypass) {
      setLoading(false);
      return;
    }

    // Get initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (isDevAuthBypass) {
      setSession(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return { session, user, loading, signOut };
}
