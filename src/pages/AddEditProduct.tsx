import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const AddEditProduct = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">Adicionar/Editar Produto</h1>
        <p className="text-md text-muted-foreground">Preencha os detalhes do seu produto para sincronizar com o Lumi Market.</p>
      </header>

      <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Detalhes do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input id="name" placeholder="Ex: Tênis Esportivo Ultra" className="font-sans" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" placeholder="Detalhes completos do produto..." rows={4} className="font-sans" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" type="number" step="0.01" placeholder="99.90" className="font-sans" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input id="stock" type="number" placeholder="100" className="font-sans" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping">Custo de Envio (R$)</Label>
                <Input id="shipping" type="number" step="0.01" placeholder="15.00" className="font-sans" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" placeholder="Roupas, Eletrônicos, etc." className="font-sans" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Cor</Label>
                <Input id="color" placeholder="Azul, Preto, Branco" className="font-sans" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="size">Tamanho</Label>
                <Input id="size" placeholder="P, M, G ou 38, 40" className="font-sans" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image">Imagem do Produto (Upload para Supabase Storage)</Label>
              <div className="flex items-center space-x-2">
                <Input id="image" type="file" accept="image/*" className="font-sans" />
                <Button type="button" variant="outline" className="shrink-0">
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
              </div>
            </div>

            <Button type="submit" className={cn(
              "w-full py-6 text-lg font-heading",
              "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
            )}>
              <Save className="mr-2 h-5 w-5" /> Salvar Produto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEditProduct;