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

// Tipagem do Produto (simplificada para a listagem)
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
}

const Products = () => {
  usePageTitle("Produtos");
  const { store, loading: storeLoading } = useStore();
  const queryClient = useQueryClient();

  // Função de busca de produtos
  const fetchProducts = async (): Promise<Product[]> => {
    if (!store) return [];
    
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, image_url')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    
    // Converte price de string para number
    return data.map(p => ({
      ...p,
      price: parseFloat(p.price as unknown as string),
    })) as Product[];
  };

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products', store?.id],
    queryFn: fetchProducts,
    enabled: !!store && !storeLoading,
  });

  // Mutação para exclusão
  const deleteMutation = useMutation({
    mutationFn: async (product: Product) => {
      // 1. Deletar imagem do storage
      if (product.image_url) {
        await deleteProductImage(product.image_url);
      }

      // 2. Deletar registro do banco de dados
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

  const handleDelete = (product: Product) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      deleteMutation.mutate(product);
    }
  };

  if (storeLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
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
            "py-6 text-lg font-heading hidden sm:flex",
            "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
          )}>
            <PlusCircle className="mr-2 h-5 w-5" /> Novo Produto
          </Button>
          <Button className="sm:hidden" size="icon">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      <div className="grid gap-6">
        {products && products.map((product) => (
          <Card key={product.id} className="flex items-center p-4 border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
            <img 
              src={product.image_url || "/placeholder.svg"} 
              alt={product.name} 
              className="w-16 h-16 object-cover rounded-lg mr-4 border border-border"
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-heading truncate">{product.name}</CardTitle>
              <p className="text-sm text-muted-foreground font-sans">Estoque: {product.stock}</p>
            </div>
            <div className="text-right mr-4">
              <p className="text-lg font-bold font-heading text-primary">R$ {product.price.toFixed(2)}</p>
            </div>
            <div className="flex space-x-2">
              <Link to={`/adicionar-produto?id=${product.id}`}>
                <Button variant="outline" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={() => handleDelete(product)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      {products && products.length === 0 && (
        <p className="text-center text-muted-foreground mt-10 font-sans">Nenhum produto cadastrado ainda.</p>
      )}
    </div>
  );
};

export default Products;