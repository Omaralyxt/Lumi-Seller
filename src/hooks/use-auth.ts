import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { showError, showSuccess } from '@/utils/toast';

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
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'role'>>) => Promise<boolean>;
}

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileError);
    return null;
  }
  return profileData as Profile;
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<Omit<AuthState, 'updateProfile'>>({
    session: null,
    profile: null,
    loading: true,
  });

  const loadSessionAndProfile = useCallback(async (currentSession: Session | null) => {
    if (currentSession) {
      const profile = await fetchProfile(currentSession.user.id);
      setAuthState({ session: currentSession, profile, loading: false });
    } else {
      setAuthState({ session: null, profile: null, loading: false });
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
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
  }, [loadSessionAndProfile]);

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'role'>>): Promise<boolean> => {
    if (!authState.profile) {
      showError("Usuário não autenticado.");
      return false;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', authState.profile.id)
      .select()
      .single();

    if (error) {
      showError(`Erro ao atualizar perfil: ${error.message}`);
      return false;
    }

    if (data) {
      setAuthState((prev) => ({
        ...prev,
        profile: data as Profile,
      }));
      showSuccess("Perfil atualizado com sucesso!");
      return true;
    }
    return false;
  };

  return { ...authState, updateProfile };
};