import React, { useState, useCallback } from 'react';
import { DetailedImage } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadProductImage, deleteProductImage } from '@/integrations/supabase/storage';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/hooks/use-auth';

// Tipagem interna para rastrear o estado do arquivo no frontend
interface FormDetailedImage extends DetailedImage {
  file: File | null;
  isNew: boolean;
  isDeleted: boolean;
}

interface DetailedDescriptionManagerProps {
  initialImages: DetailedImage[] | null;
  onImagesChange: (images: DetailedImage[]) => void;
  isSubmitting: boolean;
}

const MAX_IMAGES = 3;
const MAX_FILE_SIZE_MB = 1.5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const DetailedDescriptionManager: React.FC<DetailedDescriptionManagerProps> = ({ initialImages, onImagesChange, isSubmitting }) => {
  const { profile } = useAuth();
  
  // Inicializa o estado interno com base nas imagens carregadas
  const [images, setImages] = useState<FormDetailedImage[]>(
    (initialImages || []).map((img, index) => ({
      ...img,
      file: null,
      isNew: false,
      isDeleted: false,
      sort_order: index,
    }))
  );
  
  const activeImages = images.filter(img => !img.isDeleted);
  const canAddMoreImages = activeImages.length < MAX_IMAGES;

  // Função para lidar com o upload de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (activeImages.length + files.length > MAX_IMAGES) {
      showError(`Você pode adicionar no máximo ${MAX_IMAGES} imagens para a descrição.`);
      return;
    }
    
    const validFiles = files.filter(file => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            showError(`O arquivo "${file.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB.`);
            return false;
        }
        return true;
    });

    const newFormImages: FormDetailedImage[] = validFiles.map((file, index) => ({
      url: URL.createObjectURL(file), // URL temporária para preview
      file: file,
      isNew: true,
      isDeleted: false,
      sort_order: activeImages.length + index,
    }));

    setImages(prev => [...prev, ...newFormImages]);
    e.target.value = ''; // Limpa o input file
  };

  // Função para remover uma imagem
  const handleRemoveImage = useCallback((indexToRemove: number) => {
    setImages(prev => {
      const newImages = prev.map((img, index) => {
        if (index === indexToRemove) {
          // Se a imagem já existe no DB, marca para deleção
          if (img.url && !img.isNew) {
            return { ...img, isDeleted: true };
          }
          // Se for uma imagem nova (apenas preview), remove imediatamente
          return { ...img, isDeleted: true, url: '' }; 
        }
        return img;
      }).filter(img => img.url !== '' || !img.isDeleted); // Remove previews de novas imagens
      
      // Reajusta a ordem das imagens ativas
      const finalImages = newImages.filter(img => !img.isDeleted).map((img, index) => ({
          ...img,
          sort_order: index,
      }));
      
      // Adiciona as imagens marcadas para deleção (se tiverem URL) de volta, para que a SP as processe
      const deletedImages = newImages.filter(img => img.isDeleted && img.url);
      
      return [...finalImages, ...deletedImages];
    });
  }, []);
  
  // Efeito para sincronizar o estado interno com o estado externo (para a submissão)
  React.useEffect(() => {
    // Filtra apenas imagens ativas e prepara para o upload/salvamento
    const processImages = async () => {
        if (!profile?.id) return;
        
        const imagesToUpload = images.filter(img => img.isNew && img.file && !img.isDeleted);
        const imagesToKeep = images.filter(img => !img.isNew && !img.isDeleted);
        const imagesToDelete = images.filter(img => img.isDeleted && img.url && !img.isNew);
        
        let uploadedUrls: string[] = [];
        let deleteUrls: string[] = [];

        if (isSubmitting) {
            // 1. Upload de novas imagens
            const uploadPromises = imagesToUpload.map(img => uploadProductImage(img.file!, profile.id));
            const urls = await Promise.all(uploadPromises);
            
            if (urls.some(url => !url)) {
                showError("Falha no upload de uma ou mais imagens de descrição.");
                return;
            }
            uploadedUrls = urls.filter((url): url is string => !!url);
            
            // 2. Coletar URLs para deleção do Storage (após o sucesso da SP)
            deleteUrls = imagesToDelete.map(img => img.url);
            
            // 3. Chamar a função de deleção do storage (após o sucesso da SP)
            // NOTA: A deleção do storage é feita no AddEditProduct.tsx após a SP.
        }
        
        // 4. Preparar a lista final de DetailedImage para a SP
        const finalImages: DetailedImage[] = [
            // Imagens existentes que não foram deletadas
            ...imagesToKeep.map(img => ({ url: img.url, sort_order: img.sort_order })),
            // Novas imagens (usando URLs temporárias se não estiver submetendo, ou URLs finais se estiver)
            ...imagesToUpload.map((img, index) => ({ 
                url: isSubmitting ? uploadedUrls[index] : img.url, 
                sort_order: img.sort_order 
            })).filter(img => !!img.url),
        ].sort((a, b) => a.sort_order - b.sort_order).map((img, index) => ({
            ...img,
            sort_order: index, // Reajusta a ordem final
        }));
        
        // Se estiver submetendo, passamos a lista final para o componente pai
        if (isSubmitting) {
            onImagesChange(finalImages);
            
            // Limpeza do storage das imagens deletadas
            if (deleteUrls.length > 0) {
                const deletePromises = deleteUrls.map(url => deleteProductImage(url));
                await Promise.all(deletePromises);
            }
        }
    };
    
    // Se estiver submetendo, executamos a lógica de upload/deleção
    if (isSubmitting) {
        processImages();
    } else {
        // Se não estiver submetendo, apenas atualizamos o estado externo com as URLs atuais (para o formulário)
        const currentUrls = activeImages.map(img => ({ url: img.url, sort_order: img.sort_order }));
        onImagesChange(currentUrls);
    }
    
  }, [images, isSubmitting, profile?.id]); // Dependência de isSubmitting é crucial

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-bold flex items-center">
        <FileText className="h-5 w-5 mr-2" /> Imagens da Descrição (Máx. {MAX_IMAGES})
      </h3>
      <p className="text-sm text-muted-foreground">Adicione até {MAX_IMAGES} imagens (máx. {MAX_FILE_SIZE_MB}MB cada) para enriquecer a descrição do seu produto.</p>
      
      <div className="grid grid-cols-3 gap-4">
        {activeImages.map((img, index) => (
          <div key={img.url} className="relative aspect-square">
            <img 
              src={img.url} 
              alt={`Descrição ${index + 1}`} 
              className="w-full h-full object-cover rounded-lg border border-border"
            />
            <Button 
              type="button" 
              variant="destructive" 
              size="icon" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full z-10"
              onClick={() => handleRemoveImage(index)}
              disabled={isSubmitting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {canAddMoreImages && (
          <div className="aspect-square flex items-center justify-center border-2 border-dashed border-muted-foreground/50 rounded-lg relative hover:bg-muted/20 transition-colors cursor-pointer">
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isSubmitting}
            />
            <PlusCircle className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedDescriptionManager;