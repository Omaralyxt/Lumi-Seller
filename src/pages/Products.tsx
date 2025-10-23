import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Products = () => {
  // Placeholder data
  const products = [
    { id: 1, name: "Tênis Esportivo", price: 199.90, stock: 50, imageUrl: "/placeholder.svg" },
    { id: 2, name: "Camiseta Dry-Fit", price: 79.90, stock: 120, imageUrl: "/placeholder.svg" },
    { id: 3, name: "Relógio Smartwatch", price: 450.00, stock: 15, imageUrl: "/placeholder.svg" },
  ];

  const handleDelete = (id: number) => {
    console.log(`Deleting product ${id}`);
    // Implementation to delete product from Supabase goes here
  };

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
        {products.map((product) => (
          <Card key={product.id} className="flex items-center p-4 border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
            <img 
              src={product.imageUrl} 
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
              <Button variant="destructive" size="icon" onClick={() => handleDelete(product.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      {products.length === 0 && (
        <p className="text-center text-muted-foreground mt-10 font-sans">Nenhum produto cadastrado ainda.</p>
      )}
    </div>
  );
};

export default Products;