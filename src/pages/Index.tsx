import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/integrations/supabase/session-context';
import LoadingSpinner from '@/components/LoadingSpinner';

const Index = () => {
  const navigate = useNavigate();
  const { session, loading } = useSessionContext();

  useEffect(() => {
    if (!loading) {
      if (session) {
        // Usuário autenticado, redireciona para o dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // Usuário não autenticado, redireciona para o login
        navigate('/login', { replace: true });
      }
    }
  }, [session, loading, navigate]);

  // Mostra um spinner enquanto o estado de autenticação está sendo verificado
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size={48} />
    </div>
  );
};

export default Index;