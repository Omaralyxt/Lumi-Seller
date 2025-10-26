import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import LoadingSpinner from './LoadingSpinner';
import Layout from './Layout';
import { useOrdersRealtime } from '@/hooks/use-orders-realtime';

/**
 * Componente de Rota Protegida.
 * Verifica a autenticação e renderiza o Layout com o conteúdo da rota aninhada (Outlet).
 */
const ProtectedRoute: React.FC = () => {
  const { session, loading } = useAuth();
  
  // Ativa o listener de pedidos em tempo real para usuários autenticados
  useOrdersRealtime();

  if (loading) {
    // Mostra um spinner enquanto o estado de autenticação está sendo verificado
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!session) {
    // Se não houver sessão, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, renderiza o layout principal e o conteúdo da rota
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;