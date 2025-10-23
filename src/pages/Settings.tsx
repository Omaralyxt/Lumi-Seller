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
import { deleteProductImage, uploadProductImage } from "@/integrations/supabase/storage";
import { showSuccess } from "@/utils/toast";
import { usePageTitle } from "@/hooks/use-page-title";

// Esquema de Validação para Configurações da Loja
const storeSettingsSchema = z.object({
  name: z.string().min(3, "O nome da loja é obrigatório."),
  description: z.string().nullable(),
  logo_url: z.string().nullable(),
});

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

// Esquema de Validação para Perfil do Usuário
const profileSettingsSchema = z.object({
  first_name: z.string().min(1, "O primeiro nome é obrigatório."),
  last_name: z.string().min(1, "O sobrenome é obrigatório."),
});

type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

const Settings = () => {
  usePageTitle("Configurações");
  const navigate = useNavigate();
  const { store, loading: storeLoading, updateStore } = useStore();
  const { profile, loading: authLoading, updateProfile } = useAuth();
  
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  // Formulário da Loja
  const storeForm = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
      logo_url: null,
    },
  });

  // Formulário do Perfil
  const profileForm = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
    },
  });

  // Preencher formulários quando os dados carregarem
  useEffect(() => {
    if (store) {
      storeForm.reset({
        name: store.name,
        description: store.description,
        logo_url: store.logo_url,
      });
      setPreviewLogo(store.logo_url);
    }
    if (profile) {
      profileForm.reset({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
      });
    }
  }, [store, profile, storeForm, profileForm]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate("/login");
    }
  };

  // --- Lógica de Logotipo da Loja ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileToUpload(file);
    if (file) {
      setPreviewLogo(URL.createObjectURL(file));
    } else {
      setPreviewLogo(storeForm.getValues('logo_url'));
    }
  };

  const handleRemoveLogo = async () => {
    const currentUrl = storeForm.getValues('logo_url');
    if (currentUrl) {
      await deleteProductImage(currentUrl); 
    }
    setFileToUpload(null);
    setPreviewLogo(null);
    storeForm.setValue('logo_url', null);
  };

  const handleSaveStore = async (values: StoreSettingsFormValues) => {
    if (!store || !profile) return;

    setIsSavingStore(true);
    let logoUrl = values.logo_url;

    try {
      // 1. Upload do novo logotipo, se houver
      if (fileToUpload) {
        if (values.logo_url) {
          await deleteProductImage(values.logo_url);
        }
        
        const uploadedUrl = await uploadProductImage(fileToUpload, profile.id);
        if (!uploadedUrl) {
          throw new Error("Falha ao fazer upload do logotipo.");
        }
        logoUrl = uploadedUrl;
      }

      // 2. Atualizar dados da loja
      await updateStore({
        name: values.name,
        description: values.description,
        logo_url: logoUrl,
      });

    } catch (error) {
      console.error("Erro ao salvar configurações da loja:", error);
    } finally {
      setIsSavingStore(false);
      setFileToUpload(null); // Limpa o arquivo após o upload
    }
  };

  // --- Lógica de Perfil do Usuário ---
  const handleSaveProfile = async (values: ProfileSettingsFormValues) => {
    setIsSavingProfile(true);
    try {
      await updateProfile(values);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Funcionalidade de atualização de email/senha não implementada. Use o Supabase Auth UI para isso.");
  };

  if (storeLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <Card className="p-6 space-y-6 mb-8 rounded-xl">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">Configurações</h1>
        <p className="text-md text-muted-foreground">Gerencie as informações da sua loja e seu perfil de acesso.</p>
      </header>

      {/* User Profile Settings */}
      <Card className={cn(
        "mb-8 rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow"
      )}>
        <CardHeader>
          <CardTitle className="font-heading text-xl flex items-center"><User className="h-5 w-5 mr-2" /> Perfil do Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Primeiro Nome</Label>
                <Input 
                  id="firstName" 
                  placeholder="João" 
                  className="font-sans rounded-lg" 
                  {...profileForm.register("first_name")}
                />
                {profileForm.formState.errors.first_name && (
                  <p className="text-destructive text-sm">{profileForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input 
                  id="lastName" 
                  placeholder="Silva" 
                  className="font-sans rounded-lg" 
                  {...profileForm.register("last_name")}
                />
                {profileForm.formState.errors.last_name && (
                  <p className="text-destructive text-sm">{profileForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (Não Editável)</Label>
              <Input id="email" type="email" placeholder={profile?.session?.user.email || "N/A"} className="font-sans rounded-lg" disabled />
            </div>
            <Button type="submit" className="w-full font-heading rounded-xl neon-glow" disabled={isSavingProfile}>
              {isSavingProfile ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              {isSavingProfile ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Store Settings */}
      <Card className={cn(
        "mb-8 rounded-xl border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300 neon-glow"
      )}>
        <CardHeader>
          <CardTitle className="font-heading text-xl flex items-center"><Store className="h-5 w-5 mr-2" /> Informações da Loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={storeForm.handleSubmit(handleSaveStore)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="storeName">Nome da Loja</Label>
              <Input 
                id="storeName" 
                placeholder="Lumi Store Oficial" 
                className="font-sans rounded-lg" 
                {...storeForm.register("name")}
              />
              {storeForm.formState.errors.name && (
                <p className="text-destructive text-sm">{storeForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storeDescription">Descrição</Label>
              <Textarea 
                id="storeDescription" 
                placeholder="Uma breve descrição da sua loja..." 
                rows={3} 
                className="font-sans rounded-lg" 
                {...storeForm.register("description")}
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
                      className="w-full h-full object-contain rounded-xl border border-border p-1"
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
                  <div className="w-24 h-24 shrink-0 bg-muted rounded-xl flex items-center justify-center border border-dashed border-muted-foreground/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 w-full">
                  <Input 
                    id="logo" 
                    type="file" 
                    accept="image/*" 
                    className="font-sans rounded-lg" 
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full font-heading rounded-xl neon-glow" disabled={isSavingStore}>
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

      {/* Logout */}
      <Button onClick={handleLogout} variant="destructive" className="w-full font-heading rounded-xl">
        <LogOut className="mr-2 h-5 w-5" /> Sair da Conta
      </Button>
    </div>
  );
};

export default Settings;