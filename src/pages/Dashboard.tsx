import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Store, PlusCircle, Settings as SettingsIcon, Eye, Loader2, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import EmptyState from "@/components/EmptyState";
import { Order } from "@/types/database"; // Importando Order do novo arquivo de tipagem

// Função para buscar métricas do dashboard
const fetchDashboardMetrics = async (storeId: string) => {
  // 1. Contagem de Produtos Ativos (agora conta produtos principais)
  const { count: productCount, error: productError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId);

  if (productError) throw new Error(productError.message);

  // 2. Pedidos Pendentes (status 'paid' ou 'pending' ou 'processing')
  const { count: pendingOrders, error: pendingError } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .in('status', ['paid', 'pending', 'processing']); // Pedidos que precisam de atenção

  if (pendingError) throw new Error(pendingError.message);

  // 3. Saldo Atual (Total de vendas - simplificado para todos os pedidos entregues)
  const { data: salesData, error: salesError } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('store_id', storeId)
    .in('status', ['delivered']); // Apenas pedidos entregues contam como saldo final

  if (salesError) throw new Error(salesError.message);

  const totalBalance = salesData.reduce((sum, order) => sum + parseFloat(order.total_amount as unknown as string), 0);

  return {
    productCount: productCount || 0,
    pendingOrders: pendingOrders || 0,
    balance: totalBalance,
  };
};

// Função para buscar pedidos recentes
const fetchRecentOrders = async (storeId: string): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, total_amount, status, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return data.map(o => ({
    ...o,
    total_amount: parseFloat(o.total_amount as unknown as string),
  })) as Order[];
};

const getStatusBadge = (status: Order['status']) => {
  switch (status) {
    case 'paid':
      return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 rounded-full">Pago</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="rounded-full">Pendente</Badge>;
    case 'processing':
      return <Badge className="bg-purple-500 hover:bg-purple-600 rounded-full">Processando</Badge>;
    case 'shipped':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 rounded-full">Enviado</Badge>;
    case 'delivered':
      return <Badge className="bg-green-500 hover:bg-green-600 rounded-full">Entregue</Badge>;
    case 'canceled':
      return <Badge variant="destructive" className="rounded-full">Cancelado</Badge>;
    default:
      return <Badge variant="outline" className="rounded-full">{status}</Badge>;
  }
};

const Dashboard = () => {
  usePageTitle("Dashboard");
  const { profile } = useAuth();
  const { store, loading: storeLoading } = useStore();
  
  // Habilita as queries somente se a loja estiver carregada e não estiver em estado de carregamento inicial
  const enabled = !!store && !storeLoading;

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['dashboardMetrics', store?.id],
    queryFn: () => fetchDashboardMetrics(store!.id),
    enabled: enabled,
  });

  const { data: recentOrders, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['recentOrders', store?.id],
    queryFn: () => fetchRecentOrders(store!.id),
    enabled: enabled,
  });

  if (storeLoading || metricsLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
        <header className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Skeleton className="h-34 w-full rounded-xl" />
          <Skeleton className="h-34 w-full rounded-xl" />
          <Skeleton className="h-34 w-full rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (metricsError || ordersError) {
    return <div className="p-8 text-center text-destructive">Erro ao carregar dados do dashboard: {metricsError?.message || ordersError?.message}</div>;
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
            "w-full py-6 text-lg font-heading rounded-xl neon-glow",
            "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
          )}>
            <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Produto
          </Button>
        </Link>
        <Link to="/configuracoes" className="flex-1 min-w-[150px]">
          <Button variant="outline" className="w-full py-6 text-lg font-heading rounded-xl">
            <SettingsIcon className="mr-2 h-5 w-5" /> Gerir Loja
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Saldo Total de Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">MZN {balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground font-sans">Total acumulado de pedidos entregues</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{productCount}</div>
            <p className="text-xs text-muted-foreground font-sans">Total de itens cadastrados</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow">
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

      {/* Recent Orders List */}
      <section>
        <h2 className="text-2xl font-heading font-bold mb-4">Pedidos Recentes</h2>
        <Card className="rounded-xl">
          <CardContent className="p-0">
            {recentOrders && recentOrders.length > 0 ? (
              <div className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium font-sans">
                        #{order.id.substring(0, 8)}...
                      </div>
                      <div className="hidden sm:block">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-bold font-heading text-primary">
                        MZN {order.total_amount.toFixed(2)}
                      </div>
                      <Link to={`/pedidos/${order.id}`}>
                        <Button size="sm" variant="outline" title="Ver Detalhes" className="rounded-xl">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={ShoppingCart}
                  title="Sem Pedidos Recentes"
                  description="Nenhum pedido foi registrado recentemente. Continue promovendo seus produtos!"
                />
              </div>
            )}
          </CardContent>
        </Card>
        {recentOrders && recentOrders.length > 0 && (
          <div className="mt-4 text-right">
            <Link to="/pedidos" className="text-primary hover:underline text-sm font-sans">
              Ver todos os pedidos &rarr;
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;