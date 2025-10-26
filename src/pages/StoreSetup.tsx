import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/use-store';
import LoadingSpinner from '@/components/LoadingSpinner';
import { usePageTitle } from '@/hooks/use-page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const StoreSetup = () => {
  usePageTitle("Configuração Inicial da Loja");
  const navigate = useNavigate();
  const { store, loading, error } = useStore();

  useEffect(() => {
    if (!loading) {
      if (store) {
        // Loja carregada ou criada com sucesso, redireciona para o dashboard
        navigate('/dashboard', { replace: true });
      } else if (error) {
        // Se houver um erro grave que impeça a criação/carregamento
        console.error("Erro grave na configuração da loja:", error);
      }
    }
  }, [store, loading, error, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className={cn(
        "w-full max-w-md p-6 text-center rounded-xl shadow-lg",
        "border border-primary/50 neon-glow"
      )}>
        <CardHeader>
          <Store className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse-light" />
          <CardTitle className="text-2xl font-heading font-bold">Configurando sua Loja...</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <>
              <p className="text-muted-foreground mb-4">Estamos preparando sua loja virtual. Isso deve levar apenas alguns segundos.</p>
              <LoadingSpinner size={32} className="mt-4" />
            </>
          ) : (
            <p className="text-destructive">Ocorreu um erro ao carregar ou criar sua loja. Por favor, tente novamente mais tarde.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreSetup;