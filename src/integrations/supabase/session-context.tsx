import React, { createContext, useContext } from 'react';
import { useAuth } from '@/hooks/use-auth';
import LoadingSpinner from '@/components/LoadingSpinner';

// Define o tipo de contexto (o mesmo que o retorno de useAuth)
interface SessionContextType {
  session: ReturnType<typeof useAuth>['session'];
  profile: ReturnType<typeof useAuth>['profile'];
  loading: ReturnType<typeof useAuth>['loading'];
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuth();

  // Se estiver carregando, mostra um spinner em tela cheia
  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={authState}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionContextProvider');
  }
  return context;
};