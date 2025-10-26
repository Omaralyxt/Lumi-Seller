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

  useEffect(() => {
    let isMounted = true;
    
    const resolveAuth = async (session: Session | null) => {
      if (!isMounted) return;
      
      let profile: Profile | null = null;
      if (session) {
        profile = await fetchProfile(session.user.id);
      }
      
      if (isMounted) {
        setAuthState({ session, profile, loading: false });
        console.log('Auth: Session resolved. Loading set to false.');
      }
    };

    // 1. Configurar o listener de mudanças de estado
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth Event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        resolveAuth(session);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setAuthState({ session: null, profile: null, loading: false });
          console.log('Auth: SIGNED_OUT. Loading set to false.');
        }
      }
    });

    // 2. Verificação inicial da sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth: Initial getSession result.');
      resolveAuth(session);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []); // Dependências vazias garantem que a inicialização ocorra apenas uma vez

  return { ...authState, updateProfile };
};