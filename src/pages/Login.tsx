import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseAuth from '@/components/SupabaseAuth';
import { useAuth } from '@/hooks/use-auth';
import LoadingSpinner from '@/components/LoadingSpinner';

const Login = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth(); // Usamos o useAuth para reagir ao estado global

  // Redireciona usuários autenticados para o dashboard
  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    // Mostra um spinner enquanto verifica o estado inicial da sessão
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  // Se não estiver logado, mostra o formulário de autenticação
  return <SupabaseAuth />;
};

export default Login;