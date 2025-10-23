import { supabase } from './client';
import { showError } from '@/utils/toast';

const PRODUCTS_BUCKET = 'products'; // Usado para logos de loja (mantido)
const PRODUCT_IMAGES_BUCKET = 'product_images'; // Novo bucket para imagens de produtos

/**
 * Faz o upload de um arquivo para o Supabase Storage.
 * @param file O arquivo a ser enviado.
 * @param userId O ID do usuário (para criar um caminho único).
 * @param bucket O nome do bucket (e.g., 'products' ou 'product_images').
 * @returns A URL pública do arquivo ou null em caso de erro.
 */
export async function uploadFile(file: File, userId: string, bucket: string): Promise<string | null> {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
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
      .from(bucket)
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
 * @param bucket O nome do bucket.
 */
export async function deleteFile(publicUrl: string, bucket: string): Promise<boolean> {
  if (!publicUrl) return true;

  // Extrai o caminho do arquivo a partir da URL pública
  // Ex: .../storage/v1/object/public/bucket_name/user_id/filename.jpg
  const pathSegments = publicUrl.split('/');
  const bucketIndex = pathSegments.indexOf(bucket);
  
  if (bucketIndex === -1) {
      console.error(`Bucket ${bucket} não encontrado na URL.`);
      return false;
  }
  
  const filePath = pathSegments.slice(bucketIndex + 1).join('/');

  try {
    const { error } = await supabase.storage
      .from(bucket)
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

// Funções específicas para uso no app
export async function uploadProductLogo(file: File, userId: string): Promise<string | null> {
    return uploadFile(file, userId, PRODUCTS_BUCKET);
}

export async function deleteProductLogo(publicUrl: string): Promise<boolean> {
    return deleteFile(publicUrl, PRODUCTS_BUCKET);
}

export async function uploadProductImage(file: File, userId: string): Promise<string | null> {
    return uploadFile(file, userId, PRODUCT_IMAGES_BUCKET);
}

export async function deleteProductImage(publicUrl: string): Promise<boolean> {
    return deleteFile(publicUrl, PRODUCT_IMAGES_BUCKET);
}