import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSessionContext } from '@/integrations/supabase/session-context';
import Layout from './Layout';

/**
 * Componente de Rota Protegida.
 * Redireciona para /login se o usuário não estiver autenticado.
 * Renderiza o Layout e o conteúdo da rota aninhada (Outlet) se estiver autenticado.
 */
const ProtectedRoute: React.FC = () => {
  const { session, loading } = useSessionContext();

  // O estado de carregamento já é tratado pelo SessionContextProvider,
  // mas garantimos que a navegação só ocorra após o carregamento.
  if (loading) {
    // O SessionContextProvider já mostra um spinner, então aqui apenas esperamos.
    return null; 
  }

  if (!session) {
    // Se não houver sessão, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, renderiza o layout e o conteúdo da rota
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;