import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, DollarSign, Calendar, User, MapPin, Loader2, Truck, CheckCircle } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { usePageTitle } from "@/hooks/use-page-title";

// Tipagem do Pedido (detalhada)
interface Order {
  id: string;
  store_id: string;
  customer_id: string | null;
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  created_at: string;
}

// Tipagem do Item do Pedido
interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
}

// Tipagem do Cliente
interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  shipping_address: string;
  city: string;
  state: string;
  zip_code: string;
}

const OrderDetail = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStore();
  const queryClient = useQueryClient();
  
  usePageTitle(`Pedido #${orderId ? orderId.substring(0, 8) : 'Detalhes'}`);

  // Função de busca de pedido único
  const fetchOrder = async (): Promise<Order | null> => {
    if (!store || !orderId) return null;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('store_id', store.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(error.message);
    }
    
    return {
      ...data,
      total_amount: parseFloat(data.total_amount as unknown as string),
    } as Order;
  };

  // Função de busca dos itens do pedido
  const fetchOrderItems = async (): Promise<OrderItem[]> => {
    if (!store || !orderId) return [];

    const { data, error } = await supabase
      .from('order_items')
      .select('id, product_name, quantity, price_at_purchase')
      .eq('order_id', orderId)
      .eq('store_id', store.id);

    if (error) {
      throw new Error(error.message);
    }

    return data.map(item => ({
      ...item,
      price_at_purchase: parseFloat(item.price_at_purchase as unknown as string),
    })) as OrderItem[];
  };

  // Função de busca dos dados do cliente
  const fetchCustomer = async (customerId: string): Promise<Customer | null> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error("Erro ao buscar cliente:", error);
      }
      return null;
    }
    return data as Customer;
  };

  const { data: order, isLoading: isOrderLoading, error: orderError } = useQuery({
    queryKey: ['order', orderId, store?.id],
    queryFn: fetchOrder,
    enabled: !!store && !!orderId && !storeLoading,
  });

  const { data: items, isLoading: isItemsLoading, error: itemsError } = useQuery({
    queryKey: ['orderItems', orderId, store?.id],
    queryFn: fetchOrderItems,
    enabled: !!order && !isOrderLoading,
  });

  const { data: customer, isLoading: isCustomerLoading, error: customerError } = useQuery({
    queryKey: ['customer', order?.customer_id],
    queryFn: () => fetchCustomer(order!.customer_id!),
    enabled: !!order?.customer_id && !isOrderLoading,
  });

  // Mutação para atualização de status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: Order['status']) => {
      if (!orderId) throw new Error("ID do pedido ausente.");
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_, newStatus) => {
      showSuccess(`Status do pedido atualizado para ${newStatus}!`);
      // Invalida queries para re-fetch dos dados
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
    onError: (err) => {
      showError(`Erro ao atualizar status: ${err.message}`);
    },
  });

  const handleUpdateStatus = (newStatus: Order['status']) => {
    updateStatusMutation.mutate(newStatus);
  };

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

  if (storeLoading || isOrderLoading || isItemsLoading || (order?.customer_id && isCustomerLoading)) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full mt-6" />
      </div>
    );
  }

  if (orderError || itemsError || customerError) {
    showError(`Erro ao carregar detalhes do pedido: ${orderError?.message || itemsError?.message || customerError?.message}`);
    return <div className="p-8 text-center text-destructive">Erro ao carregar pedido.</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-muted-foreground">Pedido não encontrado ou você não tem permissão para visualizá-lo.</div>;
  }

  const subtotal = items?.reduce((sum, item) => sum + (item.price_at_purchase * item.quantity), 0) || 0;
  // Calculamos o custo de envio como a diferença, assumindo que o total inclui o frete.
  const shippingCost = order.total_amount - subtotal;

  const customerName = customer?.full_name || 'Cliente Não Encontrado';
  const customerEmail = customer?.email || 'N/A';
  const shippingAddress = customer ? 
    `${customer.shipping_address}, ${customer.city} - ${customer.state}, ${customer.zip_code}` : 
    'Endereço de envio não disponível.';

  const isUpdating = updateStatusMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/pedidos')} className="mb-4 sm:mb-0">
          <ArrowLeft className="h-5 w-5 mr-2" /> Voltar aos Pedidos
        </Button>
        <h1 className="text-3xl font-heading font-bold text-primary">Detalhes do Pedido #{order.id.substring(0, 8)}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna 1: Status e Resumo */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><DollarSign className="h-5 w-5 mr-2" /> Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Frete:</span>
                <span className="font-medium">R$ {shippingCost.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold text-primary font-heading">R$ {order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex justify-between items-center text-sm pt-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ações de Status */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><Truck className="h-5 w-5 mr-2" /> Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.status === 'paid' && (
                <Button 
                  className="w-full font-heading bg-blue-500 hover:bg-blue-600"
                  onClick={() => handleUpdateStatus('shipped')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />} Marcar como Enviado
                </Button>
              )}
              {order.status === 'shipped' && (
                <Button 
                  className="w-full font-heading bg-green-500 hover:bg-green-600"
                  onClick={() => handleUpdateStatus('delivered')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Marcar como Entregue
                </Button>
              )}
              {order.status === 'delivered' && (
                <p className="text-center text-green-600 font-medium">Pedido concluído com sucesso!</p>
              )}
              {order.status === 'pending' && (
                <p className="text-center text-yellow-600 font-medium">Aguardando confirmação de pagamento.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><User className="h-5 w-5 mr-2" /> Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-bold">{customerName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Email: {customerEmail}<br/>
                ID: {order.customer_id ? order.customer_id.substring(0, 8) : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2 & 3: Itens e Envio */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><Package className="h-5 w-5 mr-2" /> Itens do Pedido ({items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {items && items.length > 0 ? (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-sm text-muted-foreground">Qtd: {item.quantity}</span>
                      </div>
                      <span className="font-bold text-primary">R$ {(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum item encontrado para este pedido.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><MapPin className="h-5 w-5 mr-2" /> Endereço de Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">
                {shippingAddress}
              </p>
              <p className="mt-2 text-sm font-bold">
                Rastreamento: [Código de Rastreio Placeholder]
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;