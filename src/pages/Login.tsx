import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseAuth from '@/components/SupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return <SupabaseAuth />;
};

export default Login;