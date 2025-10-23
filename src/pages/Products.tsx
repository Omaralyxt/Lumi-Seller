import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { deleteProductImage } from "@/integrations/supabase/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import EmptyState from "@/components/EmptyState";
import { Product } from "@/types/database";

// Tipagem do Produto (simplificada para a listagem)
interface ProductListItem extends Omit<Product, 'shipping_cost' | 'description' | 'category'> {
  min_price: number;
  total_stock: number;
}

const Products = () => {
  usePageTitle("Produtos");
  const { store, loading: storeLoading } = useStore();
  const queryClient = useQueryClient();

  // Função de busca de produtos
  const fetchProducts = async (): Promise<ProductListItem[]> => {
    if (!store) return [];
    
    // Busca produtos e suas variantes, ordenando as variantes por preço para pegar o mínimo
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, 
        name, 
        image_url,
        product_variants (price, stock)
      `)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    
    return data.map(p => {
      const variants = p.product_variants as { price: string, stock: number }[];
      
      let minPrice = 0;
      let totalStock = 0;

      if (variants && variants.length > 0) {
        // Converte preços e calcula estoque total
        const prices = variants.map(v => parseFloat(v.price as unknown as string));
        minPrice = Math.min(...prices);
        totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
      }

      return {
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        min_price: minPrice,
        total_stock: totalStock,
      } as ProductListItem;
    });
  };

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products', store?.id],
    queryFn: fetchProducts,
    enabled: !!store && !storeLoading,
  });

  // Mutação para exclusão
  const deleteMutation = useMutation({
    mutationFn: async (product: ProductListItem) => {
      // 1. Deletar imagem do storage
      if (product.image_url) {
        await deleteProductImage(product.image_url);
      }

      // 2. Deletar registro do banco de dados (as variantes serão deletadas em cascata)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      showSuccess("Produto excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      showError(`Erro ao excluir produto: ${err.message}`);
    },
  });

  const handleDelete = (product: ProductListItem) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"? Isso removerá todas as variantes.`)) {
      deleteMutation.mutate(product);
    }
  };

  if (storeLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Erro ao carregar produtos: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary mb-2">Gestão de Produtos</h1>
          <p className="text-md text-muted-foreground">Visualize, edite e adicione novos produtos à sua loja.</p>
        </div>
        <Link to="/adicionar-produto">
          <Button className={cn(
            "py-6 text-lg font-heading hidden sm:flex rounded-xl neon-glow",
            "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
          )}>
            <PlusCircle className="mr-2 h-5 w-5" /> Novo Produto
          </Button>
          <Button className="sm:hidden rounded-xl neon-glow" size="icon">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {products && products.length > 0 ? (
        <div className="grid gap-6">
          {products.map((product) => (
            <Card key={product.id} className="flex items-center p-4 rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow">
              <img 
                src={product.image_url || "/placeholder.svg"} 
                alt={product.name} 
                className="w-16 h-16 object-cover rounded-lg mr-4 border border-border"
              />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-heading truncate">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground font-sans">Estoque Total: {product.total_stock}</p>
              </div>
              <div className="text-right mr-4">
                <p className="text-lg font-bold font-heading text-primary">MZN {product.min_price.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground font-sans">Preço Inicial</p>
              </div>
              <div className="flex space-x-2">
                <Link to={`/adicionar-produto?id=${product.id}`}>
                  <Button variant="outline" size="icon" className="rounded-xl">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  onClick={() => handleDelete(product)}
                  disabled={deleteMutation.isPending}
                  className="rounded-xl"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState
            icon={Package}
            title="Nenhum Produto Cadastrado"
            description="Parece que sua loja ainda não tem produtos. Comece a vender adicionando seu primeiro item!"
            actionText="Adicionar Primeiro Produto"
            actionLink="/adicionar-produto"
          />
        </div>
      )}
    </div>
  );
};

export default Products;