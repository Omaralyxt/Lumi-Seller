import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Save, Store, User, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteProductImage, uploadProductImage } from "@/integrations/supabase/storage"; // Reutilizando funções de storage

// Esquema de Validação para Configurações da Loja
const storeSettingsSchema = z.object({
  name: z.string().min(3, "O nome da loja é obrigatório."),
  description: z.string().nullable(),
  logo_url: z.string().nullable(),
});

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

const Settings = () => {
  const navigate = useNavigate();
  const { store, loading: storeLoading, updateStore } = useStore();
  const { profile } = useAuth();
  
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
      logo_url: null,
    },
  });

  // Preencher formulário quando a loja carregar
  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name,
        description: store.description,
        logo_url: store.logo_url,
      });
      setPreviewLogo(store.logo_url);
    }
  }, [store, form]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate("/login");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileToUpload(file);
    if (file) {
      setPreviewLogo(URL.createObjectURL(file));
    } else {
      setPreviewLogo(form.getValues('logo_url'));
    }
  };

  const handleRemoveLogo = async () => {
    const currentUrl = form.getValues('logo_url');
    if (currentUrl) {
      // Reutilizando a função de exclusão de imagem de produto, mas o bucket é o mesmo (products)
      // Nota: Idealmente, teríamos um bucket 'logos' separado, mas vamos reutilizar 'products' por simplicidade.
      await deleteProductImage(currentUrl); 
    }
    setFileToUpload(null);
    setPreviewLogo(null);
    form.setValue('logo_url', null);
    // Não salvamos no DB aqui, apenas no submit
  };

  const handleSaveStore = async (values: StoreSettingsFormValues) => {
    if (!store || !profile) return;

    setIsSavingStore(true);
    let logoUrl = values.logo_url;

    try {
      // 1. Upload do novo logotipo, se houver
      if (fileToUpload) {
        // Se houver um logo antigo, deleta
        if (values.logo_url) {
          await deleteProductImage(values.logo_url);
        }
        
        // Usamos a função de upload de produto, mas o caminho é baseado no ID do usuário
        const uploadedUrl = await uploadProductImage(fileToUpload, profile.id);
        if (!uploadedUrl) {
          throw new Error("Falha ao fazer upload do logotipo.");
        }
        logoUrl = uploadedUrl;
      }

      // 2. Atualizar dados da loja
      const success = await updateStore({
        name: values.name,
        description: values.description,
        logo_url: logoUrl,
      });

      if (success) {
        showSuccess("Configurações da loja salvas com sucesso!");
      }

    } catch (error) {
      console.error("Erro ao salvar configurações da loja:", error);
      // O updateStore já mostra o erro, mas garantimos o fallback
    } finally {
      setIsSavingStore(false);
      setFileToUpload(null); // Limpa o arquivo após o upload
    }
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Funcionalidade de atualização de email/senha não implementada. Use o Supabase Auth UI para isso.");
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <Card className="p-6 space-y-6 mb-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

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
          <form onSubmit={form.handleSubmit(handleSaveStore)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="storeName">Nome da Loja</Label>
              <Input 
                id="storeName" 
                placeholder="Lumi Store Oficial" 
                className="font-sans" 
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storeDescription">Descrição</Label>
              <Textarea 
                id="storeDescription" 
                placeholder="Uma breve descrição da sua loja..." 
                rows={3} 
                className="font-sans" 
                {...form.register("description")}
              />
            </div>
            
            {/* Logotipo */}
            <div className="grid gap-2">
              <Label htmlFor="logo">Logotipo da Loja</Label>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                
                {previewLogo ? (
                  <div className="relative w-24 h-24 shrink-0">
                    <img 
                      src={previewLogo} 
                      alt="Logo Preview" 
                      className="w-full h-full object-contain rounded-lg border border-border p-1"
                    />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveLogo}
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
                    id="logo" 
                    type="file" 
                    accept="image/*" 
                    className="font-sans" 
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full font-heading" disabled={isSavingStore}>
              {isSavingStore ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              {isSavingStore ? "Salvando..." : "Salvar Configurações da Loja"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Account Settings (Placeholder) */}
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
              <Input id="email" type="email" placeholder={profile?.email || "Carregando..."} className="font-sans" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input id="password" type="password" placeholder="Deixe em branco para não alterar" className="font-sans" disabled />
            </div>
            <Button type="submit" variant="secondary" className="w-full font-heading" disabled>
              <Save className="mr-2 h-5 w-5" /> Atualizar Email/Senha (Desabilitado)
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