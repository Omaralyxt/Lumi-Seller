import React from 'react';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  
  // O padding superior é necessário no mobile para evitar que o conteúdo fique atrás do botão do menu.
  const mobilePadding = isMobile ? "pt-16" : ""; 

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className={`flex-1 md:ml-64 ${mobilePadding}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;