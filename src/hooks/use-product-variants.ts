import { useState, useCallback } from 'react';
import { ProductVariant } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

// Define uma variante temporária para o formulário
export interface FormVariant {
  id: string; // Usado para rastrear no formulário (pode ser UUID real ou temporário)
  name: string;
  price: number;
  stock: number;
  isNew: boolean; // Indica se a variante precisa ser inserida (true) ou atualizada (false)
}

export const useProductVariants = (initialVariants: ProductVariant[] = []) => {
  const [variants, setVariants] = useState<FormVariant[]>(
    initialVariants.map(v => ({
      ...v,
      isNew: false,
    }))
  );

  const addVariant = useCallback(() => {
    setVariants(prev => [
      ...prev,
      {
        id: uuidv4(), // ID temporário para o formulário
        name: '',
        price: 0,
        stock: 0,
        isNew: true,
      },
    ]);
  }, []);

  const updateVariant = useCallback((id: string, updates: Partial<Omit<FormVariant, 'id' | 'isNew'>>) => {
    setVariants(prev => 
      prev.map(v => (v.id === id ? { ...v, ...updates } : v))
    );
  }, []);

  const removeVariant = useCallback((id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  }, []);

  return {
    variants,
    setVariants,
    addVariant,
    updateVariant,
    removeVariant,
  };
};