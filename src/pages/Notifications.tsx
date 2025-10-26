import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle, ShoppingCart, Package, Loader2, Mail } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import EmptyState from "@/components/EmptyState";
import { Notification } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const fetchNotifications = async (storeId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as Notification[];
};

const Notifications = () => {
  usePageTitle("Notificações");
  const { store, loading: storeLoading } = useStore();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['notifications', store?.id],
    queryFn: () => fetchNotifications(store!.id),
    enabled: !!store && !storeLoading,
  });

  // Mutação para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      showError(`Erro ao marcar como lida: ${err.message}`);
    },
  });
  
  // Mutação para marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('store_id', store.id)
        .eq('is_read', false);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      showSuccess("Todas as notificações marcadas como lidas.");
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      showError(`Erro ao marcar todas como lidas: ${err.message}`);
    },
  });

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_order':
        return <ShoppingCart className="h-5 w-5 text-green-500" />;
      case 'status_update':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'system':
        return <Mail className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  if (storeLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Erro ao carregar notificações: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary mb-2 flex items-center">
            <Bell className="h-6 w-6 mr-2" /> Notificações
          </h1>
          <p className="text-md text-muted-foreground">
            Você tem <span className="font-bold text-primary">{unreadCount}</span> notificações não lidas.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="rounded-xl"
          >
            {markAllAsReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Marcar todas como lidas
          </Button>
        )}
      </header>

      <Card className="rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow">
        <CardContent className="p-0">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "flex items-start p-4 transition-colors",
                    notification.is_read ? "bg-background/50" : "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <div className="mt-1 mr-4 shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("font-bold text-base", notification.is_read ? "text-foreground/80" : "text-foreground")}>
                      {notification.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleString('pt-BR')}
                    </p>
                    
                    {notification.order_id && (
                        <Link to={`/pedidos/${notification.order_id}`} className="mt-2 inline-block">
                            <Button variant="link" size="sm" className="h-auto p-0 text-primary text-sm">
                                Ver Pedido #{notification.order_id.substring(0, 8)} &rarr;
                            </Button>
                        </Link>
                    )}
                  </div>
                  
                  {!notification.is_read && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      disabled={markAsReadMutation.isPending}
                      className="shrink-0 ml-4 mt-1 text-primary hover:bg-primary/10"
                      title="Marcar como lida"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={Bell}
                title="Caixa de Entrada Vazia"
                description="Você está em dia! Nenhuma notificação pendente."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;