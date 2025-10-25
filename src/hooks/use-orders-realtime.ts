import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { useStore } from './use-store';
import { showNativeNotification, requestNotificationPermission } from '@/utils/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/utils/toast';

/**
 * Hook para configurar o listener Realtime para novos pedidos.
 */
export const useOrdersRealtime = () => {
  const { profile } = useAuth();
  const { store } = useStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Solicitar permissão de notificação no primeiro acesso
    requestNotificationPermission();

    if (!store?.id || !profile) {
      // Não configura o listener se a loja ou o perfil não estiverem carregados
      return;
    }

    const storeId = store.id;

    // 2. Configurar o canal Realtime
    const channel = supabase
      .channel(`orders_store_${storeId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders',
          filter: `store_id=eq.${storeId}` // Filtra apenas pedidos para esta loja
        },
        (payload) => {
          const newOrder = payload.new as any;
          
          // 3. Invalida as queries para atualizar a lista de pedidos e o dashboard
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
          
          // 4. Disparar notificação
          const buyerName = newOrder.buyer_name || 'Cliente';
          const totalAmount = parseFloat(newOrder.total_amount).toFixed(2);

          showNativeNotification(
            "🔔 Nova Venda Recebida!",
            `Pedido de ${buyerName} no valor de MZN ${totalAmount}.`
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime: Inscrito no canal de pedidos da loja ${storeId}`);
        } else if (status === 'CHANNEL_ERROR') {
          showError("Erro na conexão Realtime de pedidos.");
        }
      });

    return () => {
      // Limpa a inscrição ao desmontar
      supabase.removeChannel(channel);
    };
  }, [store?.id, profile, queryClient]);
};