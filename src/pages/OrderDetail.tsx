import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, DollarSign, Calendar, User, MapPin, Loader2, Truck, CheckCircle, Phone, Mail, XCircle, Clipboard, Send } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { usePageTitle } from "@/hooks/use-page-title";
import { Order, OrderItem, Customer } from "@/types/database";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import MpesaPaymentForm from "@/components/MpesaPaymentForm"; // Importando o novo componente

// Componente para gerenciar o código de rastreio
const TrackingCodeManager = ({ orderId, initialCode, isUpdating, onUpdate }: { orderId: string, initialCode: string | null, isUpdating: boolean, onUpdate: (code: string | null) => void }) => {
  const [trackingCode, setTrackingCode] = useState(initialCode || '');
  const [isEditing, setIsEditing] = useState(!initialCode);

  const handleSave = () => {
    onUpdate(trackingCode.trim() || null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTrackingCode(initialCode || '');
    setIsEditing(false);
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl flex items-center"><Send className="h-5 w-5 mr-2" /> Código de Rastreio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="flex space-x-2">
            <Input
              placeholder="Insira o código de rastreio"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              disabled={isUpdating}
              className="rounded-lg"
            />
            <Button onClick={handleSave} disabled={isUpdating || trackingCode.trim().length === 0} size="sm" className="rounded-xl">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm" className="rounded-xl" disabled={isUpdating}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <p className="font-medium text-primary break-all">{initialCode || 'Nenhum código inserido.'}</p>
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="rounded-xl">
              Editar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


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
    mutationFn: async ({ newStatus, trackingCode }: { newStatus?: Order['status'], trackingCode?: string | null }) => {
      if (!orderId) throw new Error("ID do pedido ausente.");
      
      const updates: Partial<Order> = {};
      if (newStatus) updates.status = newStatus;
      if (trackingCode !== undefined) updates.tracking_code = trackingCode;

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_, variables) => {
      if (variables.newStatus) {
        showSuccess(`Status do pedido atualizado para ${variables.newStatus}!`);
      } else if (variables.trackingCode !== undefined) {
        showSuccess(`Código de rastreio ${variables.trackingCode ? 'salvo' : 'removido'} com sucesso!`);
      }
      // Invalida queries para re-fetch dos dados
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
    onError: (err) => {
      showError(`Erro ao atualizar: ${err.message}`);
    },
  });

  const handleUpdateStatus = (newStatus: Order['status']) => {
    updateStatusMutation.mutate({ newStatus });
  };
  
  // Função para invalidar o pedido após a tentativa de pagamento (seja sucesso ou falha)
  const handlePaymentInitiated = () => {
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
  };

  const handleUpdateTrackingCode = (code: string | null) => {
    updateStatusMutation.mutate({ trackingCode: code });
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

  if (storeLoading || isOrderLoading || isItemsLoading || (order?.customer_id && isCustomerLoading)) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full mt-6 rounded-xl" />
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
  // Garante que o frete não seja negativo, embora o total_amount deva ser >= subtotal
  const shippingCost = Math.max(0, order.total_amount - subtotal); 

  const customerName = customer?.full_name || 'Cliente Não Encontrado';
  const customerEmail = customer?.email || 'N/A';
  const customerPhone = customer?.phone || 'N/A';
  
  const shippingAddress = customer ? 
    `${customer.shipping_address}\n${customer.city} - ${customer.state}, ${customer.zip_code}` : 
    'Endereço de envio não disponível.';

  const isUpdating = updateStatusMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/pedidos')} className="mb-4 sm:mb-0 rounded-xl">
          <ArrowLeft className="h-5 w-5 mr-2" /> Voltar aos Pedidos
        </Button>
        <h1 className="text-3xl font-heading font-bold text-primary">Detalhes do Pedido #{order.id.substring(0, 8)}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna 1: Status, Resumo e Cliente */}
        <div className="lg:col-span-1 space-y-6">
          <Card className={cn(
            "rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow",
            "animate-pulse-light"
          )}>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><DollarSign className="h-5 w-5 mr-2" /> Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">MZN {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Frete:</span>
                <span className="font-medium">MZN {shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Forma de Pagamento:</span>
                <span className="font-medium">{order.payment_method || 'Não especificado'}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold text-primary font-heading">MZN {order.total_amount.toFixed(2)}</span>
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
          
          {/* Formulário de Pagamento M-Pesa (Apenas se o status for pendente e o método for M-Pesa) */}
          {(order.status === 'pending' || order.status === 'processing') && order.payment_method === 'M-Pesa' && (
            <MpesaPaymentForm 
              orderId={order.id}
              orderNumber={order.order_number || order.id}
              amount={order.total_amount}
              onPaymentInitiated={handlePaymentInitiated}
            />
          )}

          {/* Ações de Status */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><Truck className="h-5 w-5 mr-2" /> Gerenciar Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.status === 'pending' && (
                <Button 
                  className="w-full font-heading bg-purple-500 hover:bg-purple-600 rounded-xl neon-glow"
                  onClick={() => handleUpdateStatus('processing')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clipboard className="h-4 w-4 mr-2" />} Marcar como Processando
                </Button>
              )}
              {order.status === 'paid' && (
                <Button 
                  className="w-full font-heading bg-purple-500 hover:bg-purple-600 rounded-xl neon-glow"
                  onClick={() => handleUpdateStatus('processing')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clipboard className="h-4 w-4 mr-2" />} Marcar como Processando
                </Button>
              )}
              {order.status === 'processing' && (
                <Button 
                  className="w-full font-heading bg-yellow-500 hover:bg-yellow-600 rounded-xl neon-glow"
                  onClick={() => handleUpdateStatus('shipped')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />} Marcar como Enviado
                </Button>
              )}
              {order.status === 'shipped' && (
                <Button 
                  className="w-full font-heading bg-green-500 hover:bg-green-600 rounded-xl neon-glow"
                  onClick={() => handleUpdateStatus('delivered')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Marcar como Entregue
                </Button>
              )}
              
              {/* Ação de Cancelamento (Disponível se não estiver entregue ou cancelado) */}
              {order.status !== 'delivered' && order.status !== 'canceled' && (
                <Button 
                  variant="destructive"
                  className="w-full font-heading rounded-xl"
                  onClick={() => handleUpdateStatus('canceled')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Cancelar Pedido
                </Button>
              )}

              {(order.status === 'delivered' || order.status === 'canceled') && (
                <p className={`text-center font-medium ${order.status === 'delivered' ? 'text-green-600' : 'text-destructive'}`}>
                  Pedido {order.status === 'delivered' ? 'concluído' : 'cancelado'}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Gerenciador de Código de Rastreio */}
          {order.status !== 'delivered' && order.status !== 'canceled' && (
            <TrackingCodeManager 
              orderId={order.id}
              initialCode={order.tracking_code}
              isUpdating={isUpdating}
              onUpdate={handleUpdateTrackingCode}
            />
          )}

          {/* Detalhes do Cliente */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><User className="h-5 w-5 mr-2" /> Detalhes do Comprador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-bold text-lg">{customerName}</p>
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                <span>{customerEmail}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="h-4 w-4 mr-2" />
                <span>{customerPhone}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2 & 3: Itens e Endereço */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><Package className="h-5 w-5 mr-2" /> Itens do Pedido ({items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {items && items.length > 0 ? (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-b-0 last:pb-0 hover:bg-muted/20 p-2 rounded-lg transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-sm text-muted-foreground">
                          Qtd: {item.quantity} @ MZN {item.price_at_purchase.toFixed(2)}
                        </span>
                      </div>
                      <span className="font-bold text-primary">MZN {(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum item encontrado para este pedido.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><MapPin className="h-5 w-5 mr-2" /> Endereço de Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">
                {shippingAddress}
              </p>
              <p className="mt-4 text-sm font-bold text-primary">
                Código de Rastreio: <span className="font-medium text-foreground">{order.tracking_code || 'N/A'}</span>
              </p>
              <p className="mt-2 text-sm font-bold text-primary">
                Status de Envio: {order.status === 'shipped' ? 'Enviado' : order.status === 'delivered' ? 'Entregue' : 'Aguardando Envio'}
              </p>
              {order.mpesa_transaction_id && (
                <p className="mt-2 text-sm font-bold text-green-600">
                  ID Transação M-Pesa: <span className="font-medium text-foreground">{order.mpesa_transaction_id}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;