import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Trash2, Image as ImageIcon, PlusCircle, X, Loader2, Package, ChevronDown, ChevronUp } from "lucide-react";
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
import { useProductVariants, FormVariant, FormImage } from "@/hooks/use-product-variants";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge"; // Importação adicionada

// Esquema de Validação
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "O nome é obrigatório."),
  description: z.string().nullable(),
  shipping_cost: z.coerce.number().min(0).nullable(),
  category: z.string().min(1, "A categoria é obrigatória."),
});

type ProductFormValues = z.infer<typeof productSchema>;

// Componente auxiliar para gerenciar imagens de uma única variante
interface VariantImageManagerProps {
    variant: FormVariant;
    updateVariantImages: (variantId: string, newImages: FormImage[]) => void;
    isSubmitting: boolean;
    maxImages: number;
}

const VariantImageManager: React.FC<VariantImageManagerProps> = ({ variant, updateVariantImages, isSubmitting, maxImages }) => {
    const activeImages = variant.images.filter(img => !img.isDeleted);
    const canAddMoreImages = activeImages.length < maxImages;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        
        if (activeImages.length + files.length > maxImages) {
            showError(`Você pode adicionar no máximo ${maxImages} imagens por variante.`);
            return;
        }

        const newImages: FormImage[] = files.map((file, index) => ({
            url: URL.createObjectURL(file),
            file: file,
            isNew: true,
            isDeleted: false,
            sort_order: activeImages.length + index,
        }));

        updateVariantImages(variant.id, [...variant.images, ...newImages]);
        e.target.value = ''; // Limpa o input file
    };

    const handleRemoveImage = useCallback((indexToRemove: number) => {
        const newImages = variant.images.map((img, index) => {
            if (index === indexToRemove) {
                // Se a imagem já existe no DB, marca para deleção
                if (img.id) {
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
        
        // Adiciona as imagens marcadas para deleção (se tiverem ID) de volta, para que a SP as processe
        const deletedImages = newImages.filter(img => img.isDeleted && img.id);
        
        updateVariantImages(variant.id, [...finalImages, ...deletedImages]);
    }, [variant.id, variant.images, updateVariantImages]);

    return (
        <div className="space-y-3 pt-3">
            <h4 className="text-sm font-bold text-muted-foreground flex items-center">
                <ImageIcon className="h-4 w-4 mr-1" /> Fotos da Variante ({activeImages.length}/{maxImages})
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {activeImages.map((img, index) => (
                    <div key={img.id || img.url} className="relative aspect-square">
                        <img 
                            src={img.url} 
                            alt={`Variante ${index + 1}`} 
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
                            onChange={handleImageUpload}
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


const AddEditProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const productId = new URLSearchParams(location.search).get('id');
  
  usePageTitle(productId ? "Editar Produto" : "Adicionar Produto");

  const { store, loading: storeLoading } = useStore();
  const { profile } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productLoading, setProductLoading] = useState(!!productId);
  
  // Removendo estado de imagens do produto
  
  const [initialVariants, setInitialVariants] = useState<ProductVariant[]>([]);
  const { variants, addVariant, updateVariant, removeVariant, setVariants, updateVariantImages, MAX_IMAGES_PER_VARIANT } = useProductVariants(initialVariants);

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
        // NOTA: O DB ainda associa imagens ao product_id. Vamos buscar todas as imagens do produto
        // e distribuí-las para a primeira variante para manter a compatibilidade temporária.
        // No futuro, o SELECT precisará ser ajustado para buscar imagens por variante.
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
          
          // 2. Carregar Variantes
          const loadedVariants = (productData.product_variants || []).map((v: any) => ({
            ...v,
            price: parseFloat(v.price as unknown as string),
          })) as ProductVariant[];
          
          // 3. Carregar Imagens (Temporariamente, todas as imagens do produto vão para a primeira variante)
          const loadedImages = (productData.product_images as ProductImage[] || [])
            .sort((a, b) => a.sort_order - b.sort_order);
            
          const variantsWithImages: FormVariant[] = loadedVariants.map((v, index) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              stock: v.stock,
              isNew: false,
              // Apenas a primeira variante recebe as imagens do produto (compatibilidade)
              images: index === 0 ? loadedImages.map(img => ({
                id: img.id,
                url: img.image_url,
                file: null,
                isNew: false,
                isDeleted: false,
                sort_order: img.sort_order,
              })) : [],
          }));
          
          setVariants(variantsWithImages);
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


  // --- Lógica de Submissão ---
  const onSubmit = async (values: ProductFormValues) => {
    if (storeLoading || !store || !profile) {
      showError("Aguarde o carregamento da loja ou faça login.");
      return;
    }
    
    if (variants.length === 0) {
        showError("O produto deve ter pelo menos uma variante.");
        return;
    }
    
    // Validação de variantes e imagens
    let totalActiveImages = 0;
    const invalidVariant = variants.find(v => {
        const activeImages = v.images.filter(img => !img.isDeleted);
        totalActiveImages += activeImages.length;
        
        return !v.name || v.price <= 0 || v.stock < 0 || activeImages.length === 0;
    });
    
    if (invalidVariant) {
        showError("Todas as variantes devem ter nome, preço maior que zero, estoque válido E pelo menos uma imagem.");
        return;
    }
    
    if (totalActiveImages === 0) {
        showError("O produto deve ter pelo menos uma imagem total.");
        return;
    }

    setIsSubmitting(true);
    
    // Lista de todas as imagens a serem deletadas do Storage (após o sucesso do DB)
    const imagesToDeleteFromStorage: FormImage[] = [];
    
    try {
      // 1. Processar uploads e preparar dados para a Stored Procedure
      
      const variantsForDB = await Promise.all(variants.map(async (v) => {
        const activeImages = v.images.filter(img => !img.isDeleted);
        const imagesMarkedForDeletion = v.images.filter(img => img.isDeleted && img.id);
        
        // 1a. Upload de novas imagens para esta variante
        const newImagesToUpload = activeImages.filter(img => img.isNew && img.file);
        const uploadPromises = newImagesToUpload.map(img => uploadProductImage(img.file!, profile.id));
        const uploadedUrls = await Promise.all(uploadPromises);
        
        if (uploadedUrls.some(url => !url)) {
          throw new Error(`Falha em um ou mais uploads de imagem para a variante ${v.name}.`);
        }
        
        // 1b. Coletar imagens para o DB
        const existingImagesToUpdate = activeImages.filter(img => !img.isNew);
        
        const imagesForDB: { id?: string, image_url: string, sort_order: number, is_deleted: boolean }[] = [
          // Imagens existentes (para reordenar)
          ...existingImagesToUpdate.map((img, index) => ({
            id: img.id,
            image_url: img.url,
            sort_order: index,
            is_deleted: false,
          })),
          // Novas imagens (com URLs já carregadas)
          ...uploadedUrls.filter((url): url is string => !!url).map((url, index) => ({
            image_url: url,
            sort_order: existingImagesToUpdate.length + index,
            is_deleted: false,
          })),
          // Imagens marcadas para deleção (para que a SP as remova do DB)
          ...imagesMarkedForDeletion.map(img => ({
              id: img.id,
              image_url: img.url, 
              sort_order: img.sort_order,
              is_deleted: true,
          }))
        ];
        
        // Adicionar imagens deletadas ao pool de limpeza do Storage
        imagesToDeleteFromStorage.push(...imagesMarkedForDeletion);

        return {
          id: v.isNew ? null : v.id, // SP usará NULL para novas inserções
          name: v.name,
          price: v.price,
          stock: v.stock,
          images: imagesForDB, // Passamos as imagens junto com a variante
        };
      }));
      
      // 2. Chamar a Stored Procedure (Transação Atômica)
      // NOTA: A stored procedure 'upsert_product_full' atualmente não aceita imagens dentro do array de variantes.
      // Para manter a funcionalidade, vamos passar todas as imagens ativas do PRODUTO (todas as variantes)
      // e confiar que a SP as gerencie no nível do produto, como antes.
      // Esta é uma limitação temporária até que o schema e a SP sejam atualizados para suportar imagens por variante.
      
      // Coletando TODAS as imagens ativas de TODAS as variantes para passar para a SP (compatibilidade)
      const allImagesForSP: { id?: string, image_url: string, sort_order: number, is_deleted: boolean }[] = [];
      let currentSortOrder = 0;
      
      variantsForDB.forEach(v => {
          v.images.filter(img => !img.is_deleted).forEach(img => {
              allImagesForSP.push({ ...img, sort_order: currentSortOrder++ });
          });
      });
      
      // Adicionando imagens marcadas para deleção (para que a SP as remova do DB)
      imagesToDeleteFromStorage.forEach(img => {
          if (img.id) {
              allImagesForSP.push({ id: img.id, image_url: img.url, sort_order: img.sort_order, is_deleted: true });
          }
      });
      
      // Variantes sem o campo 'images' para a SP
      const variantsForSP = variantsForDB.map(({ images, ...rest }) => rest);
      
      const { data: spData, error: spError } = await supabase.rpc('upsert_product_full', {
        p_product_id: productId || null,
        p_store_id: store.id,
        p_name: values.name,
        p_description: values.description,
        p_shipping_cost: values.shipping_cost,
        p_category: values.category,
        p_variants: variantsForSP, // Passando variantes
        p_images: allImagesForSP, // Passando todas as imagens (compatibilidade com a SP atual)
      });

      if (spError) {
        throw new Error(spError.message);
      }
      
      // 3. Limpeza do Storage (APENAS se a transação do DB foi bem-sucedida)
      const deleteStoragePromises = imagesToDeleteFromStorage.map(img => deleteProductImage(img.url));
      await Promise.all(deleteStoragePromises);

      // Feedback e Redirecionamento
      showSuccess(`Produto ${productId ? 'atualizado' : 'criado'} com sucesso!`);
      
      setTimeout(() => {
        navigate('/produtos');
      }, 500); 

    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      showError(`Falha ao salvar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

            {/* Variantes do Produto */}
            <div className="space-y-4">
                <h3 className="text-lg font-heading font-bold flex items-center">
                    <Package className="h-5 w-5 mr-2" /> Variantes (Preço em MZN)
                </h3>
                
                {variants.map((variant, index) => (
                    <Collapsible key={variant.id} defaultOpen={true}>
                        <div className="border border-border rounded-xl bg-muted/20">
                            <CollapsibleTrigger asChild>
                                <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/30 rounded-t-xl">
                                    <div className="flex items-center space-x-3">
                                        <span className="font-bold text-foreground">{variant.name || `Nova Variante ${index + 1}`}</span>
                                        <Badge variant="secondary" className="text-xs">Estoque: {variant.stock}</Badge>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-primary">MZN {variant.price.toFixed(2)}</span>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground data-[state=open]:hidden" />
                                        <ChevronUp className="h-4 w-4 text-muted-foreground data-[state=closed]:hidden" />
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent className="p-4 pt-0 space-y-4">
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="grid gap-1 md:col-span-1">
                                        <Label htmlFor={`variant-name-${variant.id}`} className="text-xs text-muted-foreground">Nome da Variante</Label>
                                        <Input 
                                            id={`variant-name-${variant.id}`}
                                            placeholder="Ex: Tamanho P, Cor Azul"
                                            value={variant.name}
                                            onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                                            className="font-sans rounded-lg"
                                        />
                                    </div>
                                    <div className="grid gap-1">
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
                                    <div className="grid gap-1">
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
                                </div>
                                
                                {/* Gerenciador de Imagens da Variante */}
                                <VariantImageManager
                                    variant={variant}
                                    updateVariantImages={updateVariantImages}
                                    isSubmitting={isSubmitting}
                                    maxImages={MAX_IMAGES_PER_VARIANT}
                                />

                                <div className="flex justify-end pt-2">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => removeVariant(variant.id)}
                                        className="text-destructive hover:bg-destructive/10 rounded-lg"
                                    >
                                        <X className="h-4 w-4 mr-1" /> Remover Variante
                                    </Button>
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>
                ))}
                
                <Button type="button" variant="outline" onClick={addVariant} className="w-full font-heading rounded-xl border-dashed">
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