import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, CheckCircle, Loader2 } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";

// Tipagem do Pedido
interface Order {
  id: string;
  customer_id: string | null;
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  created_at: string;
}

const Orders = () => {
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
      showSuccess(`Status do pedido ${variables.orderId} atualizado para ${variables.newStatus}!`);
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
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'shipped':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Enviado</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500 hover:bg-green-600">Entregue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
        <Card className="p-6">
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

      <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-heading">ID</TableHead>
                  <TableHead className="font-heading">Total</TableHead>
                  <TableHead className="font-heading">Data</TableHead>
                  <TableHead className="font-heading">Status</TableHead>
                  <TableHead className="font-heading text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium truncate max-w-[150px]">{order.id}</TableCell>
                      <TableCell>R$ {order.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {order.status === 'paid' && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => handleUpdateStatus(order.id, 'paid')}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />} Enviar
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateStatus(order.id, 'shipped')}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Entregue
                          </Button>
                        )}
                        {/* Se o status for pending ou delivered, não há ação de atualização aqui */}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum pedido encontrado para sua loja.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;