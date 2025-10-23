import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, DollarSign, Calendar, User, MapPin, Loader2 } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

// Tipagem do Pedido (detalhada)
interface Order {
  id: string;
  store_id: string;
  customer_id: string | null;
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  created_at: string;
}

const OrderDetail = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStore();

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
      // Se o erro for apenas "no rows found", tratamos como não encontrado
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(error.message);
    }
    
    // Converte total_amount de string para number
    return {
      ...data,
      total_amount: parseFloat(data.total_amount as unknown as string),
    } as Order;
  };

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId, store?.id],
    queryFn: fetchOrder,
    enabled: !!store && !!orderId && !storeLoading,
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

  if (storeLoading || isLoading) {
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

  if (error) {
    showError(`Erro ao carregar detalhes do pedido: ${error.message}`);
    return <div className="p-8 text-center text-destructive">Erro ao carregar pedido.</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-muted-foreground">Pedido não encontrado ou você não tem permissão para visualizá-lo.</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/pedidos')}>
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
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-xl font-bold text-primary">R$ {order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><User className="h-5 w-5 mr-2" /> Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-bold">ID do Cliente: {order.customer_id ? order.customer_id.substring(0, 8) : 'Convidado'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {/* Placeholder para dados do cliente, pois não temos a tabela de endereços */}
                Nome: [Nome do Cliente]<br/>
                Email: [Email do Cliente]
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2 & 3: Itens e Envio */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><Package className="h-5 w-5 mr-2" /> Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detalhes dos itens comprados (requer tabela `order_items`).
              </p>
              <ul className="mt-4 space-y-2">
                {/* Placeholder de Itens */}
                <li className="flex justify-between border-b pb-2">
                    <span>Produto A (x1)</span>
                    <span>R$ 50.00</span>
                </li>
                <li className="flex justify-between border-b pb-2">
                    <span>Produto B (x2)</span>
                    <span>R$ 100.00</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center"><MapPin className="h-5 w-5 mr-2" /> Endereço de Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                [Endereço de envio completo do cliente]
              </p>
              <p className="mt-2 text-sm font-bold">
                Rastreamento: [Código de Rastreio]
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;