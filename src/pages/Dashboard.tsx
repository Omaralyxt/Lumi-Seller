import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Store, PlusCircle, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Função para buscar métricas do dashboard
const fetchDashboardMetrics = async (storeId: string) => {
  // 1. Contagem de Produtos Ativos
  const { count: productCount, error: productError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId);

  if (productError) throw new Error(productError.message);

  // 2. Pedidos Pendentes (status 'paid' ou 'pending')
  const { count: pendingOrders, error: pendingError } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .in('status', ['paid', 'pending']); // Pedidos que precisam de atenção

  if (pendingError) throw new Error(pendingError.message);

  // 3. Saldo Atual (Total de vendas - simplificado para todos os pedidos não pendentes)
  const { data: salesData, error: salesError } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('store_id', storeId)
    .in('status', ['paid', 'shipped', 'delivered']);

  if (salesError) throw new Error(salesError.message);

  const totalBalance = salesData.reduce((sum, order) => sum + parseFloat(order.total_amount as unknown as string), 0);

  return {
    productCount: productCount || 0,
    pendingOrders: pendingOrders || 0,
    balance: totalBalance,
  };
};

const Dashboard = () => {
  const { profile } = useAuth();
  const { store, loading: storeLoading } = useStore();
  
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['dashboardMetrics', store?.id],
    queryFn: () => fetchDashboardMetrics(store!.id),
    enabled: !!store && !storeLoading,
  });

  if (storeLoading || metricsLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
        <header className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (metricsError) {
    return <div className="p-8 text-center text-destructive">Erro ao carregar métricas: {metricsError.message}</div>;
  }

  const storeName = store?.name || "Carregando Loja...";
  const { balance, productCount, pendingOrders } = metrics || { balance: 0, productCount: 0, pendingOrders: 0 };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-primary mb-2">Lumi Seller</h1>
        <p className="text-2xl font-heading text-foreground">{storeName} Dashboard</p>
        <p className="text-sm text-muted-foreground">Bem-vindo(a), {profile?.first_name || 'Vendedor(a)'}!</p>
      </header>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link to="/adicionar-produto" className="flex-1 min-w-[150px]">
          <Button className={cn(
            "w-full py-6 text-lg font-heading",
            "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
          )}>
            <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Produto
          </Button>
        </Link>
        <Link to="/configuracoes" className="flex-1 min-w-[150px]">
          <Button variant="outline" className="w-full py-6 text-lg font-heading">
            <SettingsIcon className="mr-2 h-5 w-5" /> Gerir Loja
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Saldo Total de Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">R$ {balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground font-sans">Total acumulado de pedidos pagos</p>
          </CardContent>
        </Card>
        
        <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{productCount}</div>
            <p className="text-xs text-muted-foreground font-sans">Total de itens cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Pedidos Pendentes</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground font-sans">Aguardando envio ou pagamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Product List Preview (Placeholder) */}
      <section>
        <h2 className="text-2xl font-heading font-bold mb-4">Seus Produtos</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground font-sans">
              Listagem de produtos virá aqui. <Link to="/produtos" className="text-primary hover:underline">Ver todos os produtos.</Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;