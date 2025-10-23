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
  updateStore: (updates: Partial<Omit<Store, 'id' | 'seller_id'>>) => Promise<boolean>;
}

export const useStore = () => {
  const { session, profile, loading: authLoading } = useAuth();
  const [storeState, setStoreState] = useState<Omit<StoreState, 'updateStore'>>({
    store: null,
    loading: true,
    error: null,
  });

  const fetchStore = async (userId: string) => {
    setStoreState((prev) => ({ ...prev, loading: true, error: null }));
    
    // 1. Tenta buscar a loja existente
    const { data: storeData, error: fetchError } = await supabase
      .from('stores')
      .select('*')
      .eq('seller_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Error fetching store:', fetchError);
      setStoreState({ store: null, loading: false, error: fetchError.message });
      showError('Erro ao carregar a loja.');
      return null;
    }

    if (storeData) {
      // Loja encontrada
      setStoreState({ store: storeData as Store, loading: false, error: null });
      return storeData as Store;
    } else {
      // 2. Loja não encontrada, cria uma nova
      showSuccess('Loja não encontrada. Criando loja padrão...');
      const defaultStoreName = `${profile?.first_name || 'Novo'} Vendedor Store`;
      
      const { data: newStoreData, error: insertError } = await supabase
        .from('stores')
        .insert({
          seller_id: userId,
          name: defaultStoreName,
          description: 'Minha loja oficial no Lumi Market.',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating store:', insertError);
        setStoreState({ store: null, loading: false, error: insertError.message });
        showError('Erro ao criar a loja padrão.');
        return null;
      } else if (newStoreData) {
        showSuccess(`Loja "${newStoreData.name}" criada com sucesso!`);
        setStoreState({ store: newStoreData as Store, loading: false, error: null });
        return newStoreData as Store;
      }
      return null;
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (session && profile) {
      fetchStore(profile.id);
    } else {
      setStoreState({ store: null, loading: false, error: null });
    }
  }, [session, profile, authLoading]);

  const updateStore = async (updates: Partial<Omit<Store, 'id' | 'seller_id'>>): Promise<boolean> => {
    if (!storeState.store) {
      showError("Nenhuma loja carregada para atualizar.");
      return false;
    }

    const { data, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', storeState.store.id)
      .select()
      .single();

    if (error) {
      showError(`Erro ao atualizar a loja: ${error.message}`);
      return false;
    }

    if (data) {
      setStoreState((prev) => ({
        ...prev,
        store: data as Store,
      }));
      return true;
    }
    return false;
  };

  return { ...storeState, updateStore };
};