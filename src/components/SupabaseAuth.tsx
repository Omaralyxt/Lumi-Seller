import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Fingerprint, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signInAsGuest } from '@/integrations/supabase/auth';
import { useNavigate } from 'react-router-dom';

const SupabaseAuth = () => {
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    const { success } = await signInAsGuest();
    if (success) {
      // O useAuth hook no App.tsx deve pegar a sessão e redirecionar, 
      // mas forçamos a navegação para garantir a transição imediata.
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className={cn(
        "w-full max-w-md p-6 md:p-8 space-y-6 bg-card rounded-xl shadow-lg",
        "border border-border/50 transition-all duration-300 hover:ring-2 hover:ring-primary/50" // Soft neon border effect
      )}>
        <div className="text-center">
          <h1 className="text-4xl font-heading font-bold text-primary mb-2">Lumi Seller</h1>
          <h2 className="text-xl font-heading text-foreground">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground font-sans">
            Manage your store and products efficiently.
          </p>
        </div>
        
        {/* Guest Login Button */}
        <div className="space-y-3">
          <Button 
            variant="secondary" 
            className="w-full font-heading text-lg py-6 border-2 border-secondary/50 hover:bg-secondary/80 transition-all duration-300"
            onClick={handleGuestLogin}
          >
            <User className="mr-2 h-5 w-5" /> Entrar como Convidado
          </Button>
          
          {/* Biometric Login Placeholder */}
          <Button 
            variant="outline" 
            className="w-full font-heading text-lg py-6 border-2 border-primary/50 hover:bg-primary/10 transition-all duration-300"
            onClick={() => alert("Funcionalidade de login biométrico (Face ID / Impressão Digital) é um placeholder.")}
          >
            <Fingerprint className="mr-2 h-5 w-5" /> Login com Biometria
          </Button>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Ou continue com email
            </span>
          </div>
        </div>

        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary)/0.8)',
                  defaultButtonBackground: 'hsl(var(--primary))',
                  defaultButtonBackgroundHover: 'hsl(var(--primary)/0.9)',
                  defaultButtonText: 'hsl(var(--primary-foreground))',
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--ring))',
                  inputBorderFocus: 'hsl(var(--ring))',
                },
                fontSizes: {
                    // Removido 'base'
                    large: '1.125rem',
                    xl: '1.25rem',
                },
                fonts: {
                    // Removido 'body'
                    button: 'Bebas Neue, sans-serif',
                }
              },
            },
          }}
          theme="light"
          view="sign_in" // Start with sign in view
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Senha',
                button_label: 'Entrar',
                link_text: 'Já tem uma conta? Entrar',
              },
              sign_up: {
                email_label: 'Email',
                password_label: 'Senha',
                password_input_placeholder: 'Mínimo 6 caracteres',
                button_label: 'Criar Conta',
                link_text: 'Não tem uma conta? Criar Conta',
                confirmation_text: 'Verifique seu email para o link de confirmação',
              },
              forgotten_password: {
                link_text: 'Esqueceu sua senha?',
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default SupabaseAuth;