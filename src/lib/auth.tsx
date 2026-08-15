import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: { display_name: string; total_points: number; current_level: number; avatar_url: string | null; has_paid: boolean } | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, isAdmin: false, profile: null,
  signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const getDisplayName = (authUser: User) => {
  const metadataName = authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return authUser.email?.split('@')[0] || 'Uživatel';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);

  const fetchProfile = async (authUser: User, retries = 8) => {
    for (let i = 0; i < retries; i++) {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', authUser.id).maybeSingle();
      if (data) {
        setProfile(data);
        return;
      }

      if (i === 1) {
        await supabase
          .from('profiles')
          .insert({ user_id: authUser.id, display_name: getDisplayName(authUser), has_paid: false });

        await supabase
          .from('section_profiles')
          .upsert([
            { user_id: authUser.id, category: 'products' },
            { user_id: authUser.id, category: 'backoffice' },
          ], { onConflict: 'user_id,category', ignoreDuplicates: true });
      }

      // Profile row may not exist yet right after signup (trigger race). Retry with backoff.
      await new Promise((r) => setTimeout(r, 500 + i * 250));
    }
    setProfile({
      display_name: getDisplayName(authUser),
      total_points: 0,
      current_level: 1,
      avatar_url: null,
      has_paid: false,
    });
  };


  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin');
    setIsAdmin(!!(data && data.length > 0));
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  useEffect(() => {
    // "Stay signed in" opt-out: session is dropped when the browser tab is closed.
    try {
      if (localStorage.getItem('auth-remember') === '0' && !sessionStorage.getItem('auth-tab')) {
        localStorage.removeItem('auth-remember');
        supabase.auth.signOut();
      }
    } catch {
      /* storage may be unavailable */
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user);
          checkAdmin(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
