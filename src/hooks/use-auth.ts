import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: 'seller' | 'buyer';
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const loadSessionAndProfile = async (currentSession: Session | null) => {
      if (currentSession) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found (new user)
          console.error('Error fetching profile:', profileError);
          setAuthState({ session: currentSession, profile: null, loading: false });
        } else if (profileData) {
          setAuthState({ session: currentSession, profile: profileData as Profile, loading: false });
        } else {
          // Profile not found, likely a new user who hasn't completed setup yet.
          setAuthState({ session: currentSession, profile: null, loading: false });
        }
      } else {
        setAuthState({ session: null, profile: null, loading: false });
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        await loadSessionAndProfile(session);
      } else if (event === 'SIGNED_OUT') {
        setAuthState({ session: null, profile: null, loading: false });
      }
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSessionAndProfile(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return authState;
};