import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Store, PlusCircle, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { profile } = useAuth();
  
  // Placeholder data
  const storeName = "Minha Loja Lumi";
  const balance = 1250.75;
  const productCount = 42;
  const pendingOrders = 5;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-primary mb-2">Lumi Seller</h1>
        <p className="text-2xl font-heading text-foreground">{storeName} Dashboard</p>
        <p className="text-sm text-muted-foreground">Bem-vindo(a), {profile?.first_name || 'Vendedor(a)'}!</p>
      </header>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link to="/adicionar-produto" className="flex-1 min-w-[150px]">
          <Button className={cn(
            "w-full py-6 text-lg font-heading",
            "border border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
          )}>
            <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Produto
          </Button>
        </Link>
        <Link to="/configuracoes" className="flex-1 min-w-[150px]">
          <Button variant="outline" className="w-full py-6 text-lg font-heading">
            <SettingsIcon className="mr-2 h-5 w-5" /> Gerir Loja
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">R$ {balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground font-sans">+20.1% desde o mês passado</p>
          </CardContent>
        </Card>
        
        <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{productCount}</div>
            <p className="text-xs text-muted-foreground font-sans">Total de itens cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">Pedidos Pendentes</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground font-sans">Aguardando envio</p>
          </CardContent>
        </Card>
      </div>

      {/* Product List Preview (Placeholder) */}
      <section>
        <h2 className="text-2xl font-heading font-bold mb-4">Seus Produtos</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground font-sans">
              Listagem de produtos virá aqui. <Link to="/produtos" className="text-primary hover:underline">Ver todos os produtos.</Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;