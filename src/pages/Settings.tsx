import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Save, Store, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const Settings = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate("/login");
    }
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Funcionalidade de salvar configurações da loja implementada aqui.");
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Funcionalidade de atualizar email/senha implementada aqui.");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">Configurações da Loja</h1>
        <p className="text-md text-muted-foreground">Gerencie as informações da sua loja e suas credenciais de acesso.</p>
      </header>

      {/* Store Settings */}
      <Card className={cn(
        "mb-8 border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
      )}>
        <CardHeader>
          <CardTitle className="font-heading text-xl flex items-center"><Store className="h-5 w-5 mr-2" /> Informações da Loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveStore} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="storeName">Nome da Loja</Label>
              <Input id="storeName" placeholder="Lumi Store Oficial" className="font-sans" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storeDescription">Descrição</Label>
              <Textarea id="storeDescription" placeholder="Uma breve descrição da sua loja..." rows={3} className="font-sans" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logo">Logotipo da Loja (URL/Upload)</Label>
              <Input id="logo" type="file" className="font-sans" />
            </div>
            <Button type="submit" className="w-full font-heading">
              <Save className="mr-2 h-5 w-5" /> Salvar Configurações da Loja
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Account Settings */}
      <Card className={cn(
        "mb-8 border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300"
      )}>
        <CardHeader>
          <CardTitle className="font-heading text-xl flex items-center"><User className="h-5 w-5 mr-2" /> Credenciais de Acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu.email@exemplo.com" className="font-sans" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input id="password" type="password" placeholder="Deixe em branco para não alterar" className="font-sans" />
            </div>
            <Button type="submit" variant="secondary" className="w-full font-heading">
              <Save className="mr-2 h-5 w-5" /> Atualizar Email/Senha
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Logout */}
      <Button onClick={handleLogout} variant="destructive" className="w-full font-heading">
        <LogOut className="mr-2 h-5 w-5" /> Sair da Conta
      </Button>
    </div>
  );
};

export default Settings;