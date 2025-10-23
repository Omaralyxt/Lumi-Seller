import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, CheckCircle, Loader2, Eye, ShoppingCart } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";
import EmptyState from "@/components/EmptyState";
import { Order } from "@/types/database";

const Orders = () => {
  usePageTitle("Pedidos");
  const { store, loading: storeLoading } = useStore();
  const queryClient = useQueryClient();

  // Função de busca de pedidos
  const fetchOrders = async (): Promise<Order[]> => {
    if (!store) return [];
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    
    // Converte total_amount de string para number
    return data.map(o => ({
      ...o,
      total_amount: parseFloat(o.total_amount as unknown as string),
    })) as Order[];
  };

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders', store?.id],
    queryFn: fetchOrders,
    enabled: !!store && !storeLoading,
  });

  // Mutação para atualização de status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string, newStatus: Order['status'] }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_, variables) => {
      showSuccess(`Status do pedido ${variables.orderId.substring(0, 8)} atualizado para ${variables.newStatus}!`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] }); // Invalida métricas do dashboard
    },
    onError: (err) => {
      showError(`Erro ao atualizar status: ${err.message}`);
    },
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 rounded-full">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="rounded-full">Pendente</Badge>;
      case 'shipped':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 rounded-full">Enviado</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500 hover:bg-green-600 rounded-full">Entregue</Badge>;
      default:
        return <Badge variant="outline" className="rounded-full">{status}</Badge>;
    }
  };

  const handleUpdateStatus = (orderId: string, currentStatus: Order['status']) => {
    let newStatus: Order['status'] | null = null;

    if (currentStatus === 'paid') {
      newStatus = 'shipped';
    } else if (currentStatus === 'shipped') {
      newStatus = 'delivered';
    }

    if (newStatus) {
      updateStatusMutation.mutate({ orderId, newStatus });
    }
  };

  if (storeLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <Card className="p-6 rounded-xl">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Erro ao carregar pedidos: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">Gestão de Pedidos</h1>
        <p className="text-md text-muted-foreground">Visualize e atualize o status dos pedidos da sua loja.</p>
      </header>

      <Card className="rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading">ID</TableHead>
                    <TableHead className="font-heading">Total (MZN)</TableHead>
                    <TableHead className="font-heading">Data</TableHead>
                    <TableHead className="font-heading">Status</TableHead>
                    <TableHead className="font-heading text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium truncate max-w-[150px]">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell>MZN {order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right space-x-2 flex justify-end items-center">
                          <Link to={`/pedidos/${order.id}`}>
                              <Button size="sm" variant="outline" title="Ver Detalhes" className="rounded-xl">
                                  <Eye className="h-4 w-4" />
                              </Button>
                          </Link>
                          
                          {order.status === 'paid' && (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={() => handleUpdateStatus(order.id, 'paid')}
                              disabled={updateStatusMutation.isPending}
                              className="rounded-xl"
                            >
                              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />} Enviar
                            </Button>
                          )}
                          {order.status === 'shipped' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateStatus(order.id, 'shipped')}
                              disabled={updateStatusMutation.isPending}
                              className="rounded-xl"
                            >
                              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Entregue
                            </Button>
                          )}
                          {/* Se o status for pending ou delivered, não há ação de atualização aqui */}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={ShoppingCart}
                title="Nenhum Pedido Encontrado"
                description="Sua loja ainda não recebeu pedidos. Continue adicionando produtos para começar a vender!"
                // Não há ação direta para criar um pedido, então omitimos actionText/actionLink
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;