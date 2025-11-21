import { useState, useCallback } from 'react';
import { ProductVariant } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

// Tipagem para imagens no formulário (copiada de AddEditProduct)
export interface FormImage {
  id?: string; // ID do banco de dados se for uma imagem existente
  url: string; // URL pública ou URL temporária (Blob)
  file: File | null; // Arquivo a ser enviado (se for novo)
  isNew: boolean; // Se é um novo upload
  isDeleted: boolean; // Se deve ser deletada do DB
  sort_order: number;
}

// Define uma variante temporária para o formulário
export interface FormVariant {
  id: string; // Usado para rastrear no formulário (pode ser UUID real ou temporário)
  name: string;
  price: number;
  stock: number;
  cut_price: number | null; // Adicionado cut_price
  isNew: boolean; // Indica se a variante precisa ser inserida (true) ou atualizada (false)
  images: FormImage[]; // Lista de imagens específicas desta variante
}

const MAX_IMAGES_PER_VARIANT = 20;

export const useProductVariants = (initialVariants: ProductVariant[] = []) => {
  const [variants, setVariants] = useState<FormVariant[]>(
    initialVariants.map(v => ({
      ...v,
      isNew: false,
      cut_price: v.cut_price || null, // Inicializa cut_price
      // Mapeia as imagens existentes para o formato FormImage
      images: v.images?.map(img => ({
        id: img.id,
        url: img.image_url,
        file: null,
        isNew: false,
        isDeleted: false,
        sort_order: img.sort_order,
      })) || [],
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
        cut_price: null, // Novo campo
        isNew: true,
        images: [], // Nova variante começa sem imagens
      },
    ]);
  }, []);

  const updateVariant = useCallback((id: string, updates: Partial<Omit<FormVariant, 'id' | 'isNew' | 'images'>>) => {
    setVariants(prev => 
      prev.map(v => (v.id === id ? { ...v, ...updates } : v))
    );
  }, []);

  const removeVariant = useCallback((id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  }, []);
  
  // Lógica de Imagens por Variante
  const updateVariantImages = useCallback((variantId: string, newImages: FormImage[]) => {
    setVariants(prev => 
      prev.map(v => (v.id === variantId ? { ...v, images: newImages } : v))
    );
  }, []);

  return {
    variants,
    setVariants,
    addVariant,
    updateVariant,
    removeVariant,
    updateVariantImages,
    MAX_IMAGES_PER_VARIANT,
  };
};