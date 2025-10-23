import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Trash2, Image as ImageIcon, PlusCircle, X, Loader2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStore } from "@/hooks/use-store";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage, deleteProductImage } from "@/integrations/supabase/storage";
import { showError, showSuccess } from "@/utils/toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import { Product, ProductVariant, ProductImage } from "@/types/database";
import { useProductVariants, FormVariant } from "@/hooks/use-product-variants";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

// Tipagem para imagens no formulário
interface FormImage {
  id?: string; // ID do banco de dados se for uma imagem existente
  url: string; // URL pública ou URL temporária (Blob)
  file: File | null; // Arquivo a ser enviado (se for novo)
  isNew: boolean; // Se é um novo upload
  isDeleted: boolean; // Se deve ser deletada do DB
  sort_order: number;
}

const MAX_IMAGES = 6;

// Esquema de Validação
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "O nome é obrigatório."),
  description: z.string().nullable(),
  shipping_cost: z.coerce.number().min(0).nullable(),
  category: z.string().min(1, "A categoria é obrigatória."),
});

type ProductFormValues = z.infer<typeof productSchema>;

const AddEditProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const productId = new URLSearchParams(location.search).get('id');
  
  usePageTitle(productId ? "Editar Produto" : "Adicionar Produto");

  const { store, loading: storeLoading } = useStore();
  const { profile } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productLoading, setProductLoading] = useState(!!productId);
  
  // Estado para Imagens
  const [images, setImages] = useState<FormImage[]>([]);
  
  const [initialVariants, setInitialVariants] = useState<ProductVariant[]>([]);
  const { variants, addVariant, updateVariant, removeVariant, setVariants } = useProductVariants(initialVariants);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      shipping_cost: 0,
      category: "",
    },
  });

  // Carregar dados do produto e variantes para edição
  useEffect(() => {
    if (productId && store && !storeLoading) {
      const fetchProductData = async () => {
        // 1. Buscar Produto, Variantes e Imagens
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *, 
            product_variants(*),
            product_images(*)
          `)
          .eq('id', productId)
          .eq('store_id', store.id)
          .single();

        if (productError) {
          showError("Erro ao carregar produto para edição.");
          console.error(productError);
          navigate('/produtos', { replace: true });
          return;
        }

        if (productData) {
          form.reset({
            ...productData,
            shipping_cost: productData.shipping_cost ? parseFloat(productData.shipping_cost as unknown as string) : 0,
            category: productData.category || "",
          });
          
          // 2. Carregar Imagens
          const loadedImages = (productData.product_images as ProductImage[] || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(img => ({
              id: img.id,
              url: img.image_url,
              file: null,
              isNew: false,
              isDeleted: false,
              sort_order: img.sort_order,
            }));
          setImages(loadedImages);

          // 3. Carregar Variantes
          const loadedVariants = (productData.product_variants || []).map((v: any) => ({
            ...v,
            price: parseFloat(v.price as unknown as string),
          })) as ProductVariant[];
          
          setInitialVariants(loadedVariants);
          setVariants(loadedVariants.map(v => ({ ...v, isNew: false })));
        }
        setProductLoading(false);
      };
      fetchProductData();
    } else if (!productId) {
      // Se for novo produto, garante que haja pelo menos uma variante padrão
      if (variants.length === 0) {
        addVariant();
      }
      setProductLoading(false);
    }
  }, [productId, store, storeLoading, form, navigate]);

  // --- Lógica de Imagens ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.filter(img => !img.isDeleted).length + files.length > MAX_IMAGES) {
      showError(`Você pode adicionar no máximo ${MAX_IMAGES} imagens.`);
      return;
    }

    const newImages: FormImage[] = files.map((file, index) => ({
      url: URL.createObjectURL(file),
      file: file,
      isNew: true,
      isDeleted: false,
      sort_order: images.length + index,
    }));

    setImages(prev => [...prev, ...newImages]);
    e.target.value = ''; // Limpa o input file
  };

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    setImages(prev => 
      prev.map((img, index) => {
        if (index === indexToRemove) {
          // Se a imagem já existe no DB, marca para deleção
          if (img.id) {
            return { ...img, isDeleted: true };
          }
          // Se for uma imagem nova (apenas preview), remove imediatamente
          return { ...img, isDeleted: true, url: '' }; 
        }
        return img;
      }).filter(img => img.url !== '' || !img.isDeleted) // Remove previews de novas imagens
    );
  }, []);

  // --- Lógica de Submissão ---
  const onSubmit = async (values: ProductFormValues) => {
    if (storeLoading || !store || !profile) {
      showError("Aguarde o carregamento da loja ou faça login.");
      return;
    }
    
    const activeImages = images.filter(img => !img.isDeleted);
    if (activeImages.length === 0) {
        showError("O produto deve ter pelo menos uma imagem.");
        return;
    }
    
    if (variants.length === 0) {
        showError("O produto deve ter pelo menos uma variante.");
        return;
    }
    
    // Validação de variantes
    const invalidVariant = variants.find(v => !v.name || v.price <= 0 || v.stock < 0);
    if (invalidVariant) {
        showError("Todas as variantes devem ter nome, preço maior que zero e estoque válido.");
        return;
    }

    setIsSubmitting(true);
    let newProductId = productId;

    try {
      // 1. Inserir/Atualizar Produto Principal (sem image_url)
      const productData = {
        store_id: store.id,
        name: values.name,
        description: values.description,
        shipping_cost: values.shipping_cost,
        category: values.category,
        // image_url removido
      };

      let productResult;
      if (productId) {
        // Edição
        productResult = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)
          .select('id')
          .single();
        newProductId = productId;
      } else {
        // Criação
        productResult = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();
        newProductId = productResult.data?.id;
      }

      if (productResult.error || !newProductId) {
        throw new Error(productResult.error?.message || "Falha ao obter ID do produto.");
      }

      // 2. Gerenciar Imagens
      
      // 2a. Deletar imagens marcadas para exclusão (do Storage e do DB)
      const imagesToDelete = images.filter(img => img.isDeleted && img.id);
      const deletePromises = imagesToDelete.map(async (img) => {
        // Deleta do Storage
        await deleteProductImage(img.url);
        // Deleta do DB (ON DELETE CASCADE garante que o registro seja removido)
        const { error } = await supabase.from('product_images').delete().eq('id', img.id);
        if (error) console.error("Erro ao deletar registro de imagem:", error);
      });
      await Promise.all(deletePromises);

      // 2b. Upload de novas imagens (em paralelo)
      const newImagesToUpload = activeImages.filter(img => img.isNew && img.file);
      const uploadPromises = newImagesToUpload.map(img => uploadProductImage(img.file!, profile.id));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      if (uploadedUrls.some(url => !url)) {
        throw new Error("Falha em um ou mais uploads de imagem.");
      }

      // 2c. Preparar dados para inserção/atualização no DB
      const existingImagesToUpdate = activeImages.filter(img => !img.isNew);
      
      // Mapeia as URLs recém-carregadas para os objetos de imagem a serem inseridos
      const imagesToInsertDB = uploadedUrls.filter((url): url is string => !!url).map((url, index) => ({
        product_id: newProductId!,
        store_id: store.id,
        image_url: url,
        sort_order: existingImagesToUpdate.length + index, // Define a ordem após as existentes
      }));

      // Combina imagens existentes (para atualizar a ordem) e novas imagens
      const allImagesToUpsert = [
        ...existingImagesToUpdate.map((img, index) => ({
          id: img.id,
          product_id: newProductId!,
          store_id: store.id,
          image_url: img.url,
          sort_order: index, // Reordena as imagens ativas
        })),
        ...imagesToInsertDB,
      ];

      if (allImagesToUpsert.length > 0) {
        const { error: upsertImagesError } = await supabase
          .from('product_images')
          .upsert(allImagesToUpsert);
        
        if (upsertImagesError) throw new Error(`Erro ao salvar imagens: ${upsertImagesError.message}`);
      }

      // 3. Gerenciar Variantes (Lógica de otimização)
      
      // 3a. Identificar IDs de variantes existentes que foram removidas
      const activeExistingVariantIds = variants.filter(v => !v.isNew).map(v => v.id);
      const variantsToDelete = initialVariants.map(v => v.id).filter(id => !activeExistingVariantIds.includes(id));
      
      if (variantsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_variants')
          .delete()
          .in('id', variantsToDelete);
        if (deleteError) console.error("Erro ao deletar variantes antigas:", deleteError);
      }

      // 3b. Inserir/Atualizar variantes
      const variantsToUpsert = variants.map(v => ({
        // Inclui o ID se for uma atualização, omite se for uma nova inserção (o DB gera o ID)
        ...(v.isNew ? {} : { id: v.id }), 
        product_id: newProductId!,
        store_id: store.id,
        name: v.name,
        price: v.price,
        stock: v.stock,
      }));
      
      if (variantsToUpsert.length > 0) {
        // Usamos upsert para lidar com inserções (sem id) e atualizações (com id) em uma única chamada
        const { error: upsertError } = await supabase
          .from('product_variants')
          .upsert(variantsToUpsert);

        if (upsertError) throw new Error(`Erro ao salvar variantes: ${upsertError.message}`);
      }

      // Feedback e Redirecionamento
      showSuccess(`Produto ${productId ? 'atualizado' : 'criado'} com sucesso!`);
      
      // Adiciona um pequeno atraso para garantir que o toast seja visível
      setTimeout(() => {
        navigate('/produtos');
      }, 500); // 500ms de atraso

    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      showError(`Erro ao salvar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (storeLoading || productLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <Card className="p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    );
  }

  const activeImagesCount = images.filter(img => !img.isDeleted).length;
  const canAddMoreImages = activeImagesCount < MAX_IMAGES;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">
          {productId ? "Editar Produto" : "Adicionar Novo Produto"}
        </h1>
        <p className="text-md text-muted-foreground">Gerencie as variantes e detalhes do seu produto.</p>
      </header>

      <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 rounded-xl">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Detalhes do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Nome e Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input 
                id="name" 
                placeholder="Ex: Tênis Esportivo Ultra" 
                className="font-sans rounded-lg" 
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description" 
                placeholder="Detalhes completos do produto..." 
                rows={4} 
                className="font-sans rounded-lg" 
                {...form.register("description")}
              />
            </div>
            
            {/* Categoria e Envio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  onValueChange={(value) => form.setValue("category", value, { shouldValidate: true })}
                  value={form.watch("category") || ""}
                >
                  <SelectTrigger className="font-sans rounded-lg">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((group) => (
                      <SelectGroup key={group.group}>
                        <SelectLabel>{group.group}</SelectLabel>
                        {group.categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping">Custo de Envio (MZN)</Label>
                <Input 
                  id="shipping" 
                  type="number" 
                  step="0.01" 
                  placeholder="15.00" 
                  className="font-sans rounded-lg" 
                  {...form.register("shipping_cost", { valueAsNumber: true })}
                />
              </div>
            </div>

            <Separator />

            {/* Imagens do Produto */}
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-bold flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" /> Imagens do Produto ({activeImagesCount}/{MAX_IMAGES})
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {images.filter(img => !img.isDeleted).map((img, index) => (
                  <div key={img.id || img.url} className="relative aspect-square">
                    <img 
                      src={img.url} 
                      alt={`Produto ${index + 1}`} 
                      className="w-full h-full object-cover rounded-xl border border-border"
                    />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
                      onClick={() => handleRemoveImage(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {canAddMoreImages && (
                  <div className="aspect-square flex items-center justify-center border-2 border-dashed border-muted-foreground/50 rounded-xl relative hover:bg-muted/20 transition-colors cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <PlusCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              {!canAddMoreImages && (
                <p className="text-sm text-muted-foreground text-center">Limite máximo de {MAX_IMAGES} imagens atingido.</p>
              )}
            </div>

            <Separator />

            {/* Variantes do Produto */}
            <div className="space-y-4">
                <h3 className="text-lg font-heading font-bold flex items-center">
                    <Package className="h-5 w-5 mr-2" /> Variantes (Preço em MZN)
                </h3>
                
                {variants.map((variant, index) => (
                    <div key={variant.id} className="flex flex-col sm:flex-row gap-3 p-3 border border-border rounded-lg bg-muted/20">
                        <div className="flex-1 grid gap-1">
                            <Label htmlFor={`variant-name-${variant.id}`} className="text-xs text-muted-foreground">Nome da Variante (Ex: P/Azul)</Label>
                            <Input 
                                id={`variant-name-${variant.id}`}
                                placeholder="Ex: Tamanho P, Cor Azul"
                                value={variant.name}
                                onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                                className="font-sans rounded-lg"
                            />
                        </div>
                        <div className="w-full sm:w-32 grid gap-1">
                            <Label htmlFor={`variant-price-${variant.id}`} className="text-xs text-muted-foreground">Preço (MZN)</Label>
                            <Input 
                                id={`variant-price-${variant.id}`}
                                type="number"
                                step="0.01"
                                placeholder="100.00"
                                value={variant.price}
                                onChange={(e) => updateVariant(variant.id, { price: parseFloat(e.target.value) || 0 })}
                                className="font-sans rounded-lg"
                            />
                        </div>
                        <div className="w-full sm:w-24 grid gap-1">
                            <Label htmlFor={`variant-stock-${variant.id}`} className="text-xs text-muted-foreground">Estoque</Label>
                            <Input 
                                id={`variant-stock-${variant.id}`}
                                type="number"
                                placeholder="10"
                                value={variant.stock}
                                onChange={(e) => updateVariant(variant.id, { stock: parseInt(e.target.value) || 0 })}
                                className="font-sans rounded-lg"
                            />
                        </div>
                        <div className="flex items-end pb-1">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeVariant(variant.id)}
                                className="text-destructive hover:bg-destructive/10"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                
                <Button type="button" variant="outline" onClick={addVariant} className="w-full font-heading rounded-lg border-dashed">
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Variante
                </Button>
            </div>

            <Button 
              type="submit" 
              className={cn(
                "w-full py-6 text-lg font-heading rounded-xl",
                "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
              )}
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-5 w-5" /> 
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : productId ? "Atualizar Produto" : "Salvar Produto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEditProduct;