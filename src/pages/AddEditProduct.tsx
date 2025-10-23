import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Save, Trash2, Image as ImageIcon, PlusCircle, X, Loader2, Package } from "lucide-react";
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
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import { Product, ProductVariant } from "@/types/database";
import { useProductVariants, FormVariant } from "@/hooks/use-product-variants";
import { Separator } from "@/components/ui/separator";

// Esquema de Validação
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "O nome é obrigatório."),
  description: z.string().nullable(),
  shipping_cost: z.coerce.number().min(0).nullable(),
  category: z.string().nullable(),
  image_url: z.string().nullable(),
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  
  const [initialVariants, setInitialVariants] = useState<ProductVariant[]>([]);
  const { variants, addVariant, updateVariant, removeVariant, setVariants } = useProductVariants(initialVariants);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      shipping_cost: 0,
      category: "",
      image_url: null,
    },
  });

  // Carregar dados do produto e variantes para edição
  useEffect(() => {
    if (productId && store && !storeLoading) {
      const fetchProductData = async () => {
        // 1. Buscar Produto
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*, product_variants(*)') // Busca produto e suas variantes
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
          });
          setPreviewImage(productData.image_url);
          
          // 2. Carregar Variantes
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

  // --- Lógica de Imagem ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileToUpload(file);
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
    } else {
      setPreviewImage(form.getValues('image_url'));
    }
  };

  const handleRemoveImage = async () => {
    const currentUrl = form.getValues('image_url');
    if (currentUrl) {
      await deleteProductImage(currentUrl);
    }
    setFileToUpload(null);
    setPreviewImage(null);
    form.setValue('image_url', null);
    showSuccess("Imagem removida.");
  };

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
    
    // Validação de variantes
    const invalidVariant = variants.find(v => !v.name || v.price <= 0 || v.stock < 0);
    if (invalidVariant) {
        showError("Todas as variantes devem ter nome, preço maior que zero e estoque válido.");
        return;
    }

    setIsSubmitting(true);
    let imageUrl = values.image_url;
    let newProductId = productId;

    try {
      // 1. Upload da nova imagem
      if (fileToUpload) {
        if (values.image_url) {
          await deleteProductImage(values.image_url);
        }
        
        const uploadedUrl = await uploadProductImage(fileToUpload, profile.id);
        if (!uploadedUrl) {
          throw new Error("Falha ao fazer upload da imagem.");
        }
        imageUrl = uploadedUrl;
      }

      const productData = {
        store_id: store.id,
        name: values.name,
        description: values.description,
        shipping_cost: values.shipping_cost,
        category: values.category,
        image_url: imageUrl,
      };

      // 2. Inserir/Atualizar Produto Principal
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

      // 3. Gerenciar Variantes
      const existingVariantIds = initialVariants.map(v => v.id);
      const currentVariantIds = variants.map(v => v.id).filter(id => !id.startsWith('temp-')); // Filtra IDs temporários

      // 3a. Deletar variantes removidas
      const variantsToDelete = existingVariantIds.filter(id => !currentVariantIds.includes(id));
      if (variantsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_variants')
          .delete()
          .in('id', variantsToDelete);
        if (deleteError) console.error("Erro ao deletar variantes antigas:", deleteError);
      }

      // 3b. Inserir/Atualizar variantes
      const variantsToInsert = variants.filter(v => v.isNew).map(v => ({
        product_id: newProductId!,
        store_id: store.id,
        name: v.name,
        price: v.price,
        stock: v.stock,
      }));

      const variantsToUpdate = variants.filter(v => !v.isNew).map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
        stock: v.stock,
      }));
      
      if (variantsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('product_variants')
          .insert(variantsToInsert);
        if (insertError) throw new Error(insertError.message);
      }

      if (variantsToUpdate.length > 0) {
        // Usamos upsert para atualizar em lote, mas precisamos garantir que o ID esteja presente
        const { error: updateError } = await supabase
          .from('product_variants')
          .upsert(variantsToUpdate);
        if (updateError) throw new Error(updateError.message);
      }


      showSuccess(`Produto ${productId ? 'atualizado' : 'criado'} com sucesso!`);
      navigate('/produtos');

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
                <Input id="category" placeholder="Roupas, Eletrônicos, etc." className="font-sans rounded-lg" {...form.register("category")} />
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

            <Separator />

            {/* Imagem do Produto */}
            <div className="grid gap-2">
              <Label htmlFor="image">Imagem do Produto</Label>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                
                {previewImage ? (
                  <div className="relative w-24 h-24 shrink-0">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover rounded-xl border border-border"
                    />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 shrink-0 bg-muted rounded-xl flex items-center justify-center border border-dashed border-muted-foreground/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 w-full">
                  <Input 
                    id="image" 
                    type="file" 
                    accept="image/*" 
                    className="font-sans rounded-lg" 
                    onChange={handleFileChange}
                  />
                </div>
              </div>
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