import { supabase } from './client';
import { showError } from '@/utils/toast';

const PRODUCTS_BUCKET = 'products';

/**
 * Faz o upload de um arquivo para o Supabase Storage no bucket 'products'.
 * @param file O arquivo a ser enviado.
 * @param userId O ID do usuário (para criar um caminho único).
 * @returns A URL pública do arquivo ou null em caso de erro.
 */
export async function uploadProductImage(file: File, userId: string): Promise<string | null> {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      showError(`Erro ao fazer upload da imagem: ${uploadError.message}`);
      return null;
    }

    // Obter a URL pública
    const { data } = supabase.storage
      .from(PRODUCTS_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (e) {
    showError('Erro inesperado durante o upload da imagem.');
    console.error(e);
    return null;
  }
}

/**
 * Remove um arquivo do Supabase Storage.
 * @param publicUrl A URL pública do arquivo a ser removido.
 */
export async function deleteProductImage(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return true;

  // Extrai o caminho do arquivo a partir da URL pública
  // Ex: .../storage/v1/object/public/products/user_id/filename.jpg
  const pathSegments = publicUrl.split('/');
  const filePath = pathSegments.slice(pathSegments.indexOf(PRODUCTS_BUCKET) + 1).join('/');

  try {
    const { error } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar imagem:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Erro inesperado ao deletar imagem:', e);
    return false;
  }
}