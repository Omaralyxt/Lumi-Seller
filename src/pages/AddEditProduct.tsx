import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Save, Trash2, Image as ImageIcon } from "lucide-react";
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

// Tipagem do Produto
interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  color: string | null;
  size: string | null;
  stock: number;
  shipping_cost: number | null;
  image_url: string | null;
}

// Esquema de Validação
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "O nome é obrigatório."),
  description: z.string().nullable(),
  price: z.coerce.number().min(0.01, "O preço deve ser maior que zero."),
  stock: z.coerce.number().int().min(0, "O estoque não pode ser negativo."),
  shipping_cost: z.coerce.number().min(0).nullable(),
  category: z.string().nullable(),
  color: z.string().nullable(),
  size: z.string().nullable(),
  image_url: z.string().nullable(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const AddEditProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const productId = new URLSearchParams(location.search).get('id');
  
  const { store, loading: storeLoading } = useStore();
  const { profile } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productLoading, setProductLoading] = useState(!!productId);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      shipping_cost: 0,
      category: "",
      color: "",
      size: "",
      image_url: null,
    },
  });

  // Carregar dados do produto para edição
  useEffect(() => {
    if (productId && store && !storeLoading) {
      const fetchProduct = async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('store_id', store.id)
          .single();

        if (error) {
          showError("Erro ao carregar produto para edição.");
          console.error(error);
          navigate('/produtos', { replace: true });
          return;
        }

        if (data) {
          form.reset({
            ...data,
            price: parseFloat(data.price as unknown as string),
            shipping_cost: data.shipping_cost ? parseFloat(data.shipping_cost as unknown as string) : 0,
          });
          setPreviewImage(data.image_url);
        }
        setProductLoading(false);
      };
      fetchProduct();
    } else if (!productId) {
      setProductLoading(false);
    }
  }, [productId, store, storeLoading, form, navigate]);

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

  const onSubmit = async (values: ProductFormValues) => {
    if (storeLoading || !store || !profile) {
      showError("Aguarde o carregamento da loja ou faça login.");
      return;
    }

    setIsSubmitting(true);
    let imageUrl = values.image_url;

    try {
      // 1. Upload da nova imagem, se houver
      if (fileToUpload) {
        // Se estiver editando e houver uma imagem antiga, deleta
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
        price: values.price,
        stock: values.stock,
        shipping_cost: values.shipping_cost,
        category: values.category,
        color: values.color,
        size: values.size,
        image_url: imageUrl,
      };

      let result;
      if (productId) {
        // Edição
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)
          .select()
          .single();
      } else {
        // Criação
        result = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(result.error.message);
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
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
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
        <p className="text-md text-muted-foreground">Preencha os detalhes do seu produto para sincronizar com o Lumi Market.</p>
      </header>

      <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Detalhes do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input 
                id="name" 
                placeholder="Ex: Tênis Esportivo Ultra" 
                className="font-sans" 
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description" 
                placeholder="Detalhes completos do produto..." 
                rows={4} 
                className="font-sans" 
                {...form.register("description")}
              />
            </div>

            {/* Preço, Estoque, Envio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.01" 
                  placeholder="99.90" 
                  className="font-sans" 
                  {...form.register("price", { valueAsNumber: true })}
                />
                {form.formState.errors.price && (
                  <p className="text-destructive text-sm">{form.formState.errors.price.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input 
                  id="stock" 
                  type="number" 
                  placeholder="100" 
                  className="font-sans" 
                  {...form.register("stock", { valueAsNumber: true })}
                />
                {form.formState.errors.stock && (
                  <p className="text-destructive text-sm">{form.formState.errors.stock.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping">Custo de Envio (R$)</Label>
                <Input 
                  id="shipping" 
                  type="number" 
                  step="0.01" 
                  placeholder="15.00" 
                  className="font-sans" 
                  {...form.register("shipping_cost", { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Categoria, Cor, Tamanho */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" placeholder="Roupas, Eletrônicos, etc." className="font-sans" {...form.register("category")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Cor</Label>
                <Input id="color" placeholder="Azul, Preto, Branco" className="font-sans" {...form.register("color")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="size">Tamanho</Label>
                <Input id="size" placeholder="P, M, G ou 38, 40" className="font-sans" {...form.register("size")} />
              </div>
            </div>

            {/* Imagem do Produto */}
            <div className="grid gap-2">
              <Label htmlFor="image">Imagem do Produto</Label>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                
                {previewImage ? (
                  <div className="relative w-24 h-24 shrink-0">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover rounded-lg border border-border"
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
                  <div className="w-24 h-24 shrink-0 bg-muted rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 w-full">
                  <Input 
                    id="image" 
                    type="file" 
                    accept="image/*" 
                    className="font-sans" 
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className={cn(
                "w-full py-6 text-lg font-heading",
                "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
              )}
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-5 w-5" /> 
              {isSubmitting ? "Salvando..." : productId ? "Atualizar Produto" : "Salvar Produto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEditProduct;