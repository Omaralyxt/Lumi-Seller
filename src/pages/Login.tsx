import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseAuth from '@/components/SupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const navigate = useNavigate();

  // Redirect authenticated users away from the login page immediately
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    };

    checkUser();
    
    // We rely on App.tsx's useAuth for global state, but keep this local check for immediate redirect.
  }, [navigate]);

  return <SupabaseAuth />;
};

export default Login;