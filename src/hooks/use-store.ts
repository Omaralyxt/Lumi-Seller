import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { showError, showSuccess } from '@/utils/toast';

interface Store {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

interface StoreState {
  store: Store | null;
  loading: boolean;
  error: string | null;
}

export const useStore = () => {
  const { session, profile, loading: authLoading } = useAuth();
  const [storeState, setStoreState] = useState<StoreState>({
    store: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !session || !profile) {
      if (!authLoading) {
        setStoreState({ store: null, loading: false, error: null });
      }
      return;
    }

    const fetchOrCreateStore = async () => {
      setStoreState((prev) => ({ ...prev, loading: true, error: null }));
      
      // 1. Tenta buscar a loja existente
      const { data: storeData, error: fetchError } = await supabase
        .from('stores')
        .select('*')
        .eq('seller_id', profile.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error('Error fetching store:', fetchError);
        setStoreState({ store: null, loading: false, error: fetchError.message });
        showError('Erro ao carregar a loja.');
        return;
      }

      if (storeData) {
        // Loja encontrada
        setStoreState({ store: storeData as Store, loading: false, error: null });
      } else {
        // 2. Loja não encontrada, cria uma nova
        showSuccess('Loja não encontrada. Criando loja padrão...');
        const defaultStoreName = `${profile.first_name || 'Novo'} Vendedor Store`;
        
        const { data: newStoreData, error: insertError } = await supabase
          .from('stores')
          .insert({
            seller_id: profile.id,
            name: defaultStoreName,
            description: 'Minha loja oficial no Lumi Market.',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating store:', insertError);
          setStoreState({ store: null, loading: false, error: insertError.message });
          showError('Erro ao criar a loja padrão.');
        } else if (newStoreData) {
          showSuccess(`Loja "${newStoreData.name}" criada com sucesso!`);
          setStoreState({ store: newStoreData as Store, loading: false, error: null });
        }
      }
    };

    fetchOrCreateStore();
  }, [session, profile, authLoading]);

  return storeState;
};