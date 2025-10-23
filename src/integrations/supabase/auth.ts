import { supabase } from './client';
import { showSuccess, showError } from '@/utils/toast';

// Função para fazer login como convidado (usuário de teste)
export async function signInAsGuest() {
  try {
    // Tenta fazer login com credenciais de teste predefinidas
    const { error } = await supabase.auth.signInWithPassword({
      email: 'guest@lumiseller.com',
      password: 'guestpassword',
    });

    if (error) {
      // Se o login falhar (ex: usuário não existe), tenta criar o usuário
      if (error.message.includes('Invalid login credentials')) {
        showSuccess('Criando conta de convidado...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'guest@lumiseller.com',
          password: 'guestpassword',
          options: {
            data: {
              first_name: 'Convidado',
              last_name: 'Lumi',
              role: 'seller', // Define a role como seller
            },
          },
        });

        if (signUpError) {
          showError(`Erro ao criar conta de convidado: ${signUpError.message}`);
          return { success: false };
        }
        
        // Se o cadastro for bem-sucedido, o Supabase envia um email de confirmação.
        // Para fins de desenvolvimento, vamos forçar o login após o cadastro (em um ambiente real, isso exigiria confirmação de email).
        // No entanto, o Supabase Auth UI já lida com o fluxo de confirmação.
        // Para simplificar o acesso imediato, vamos apenas informar o usuário.
        showSuccess('Conta de convidado criada! Por favor, verifique o email guest@lumiseller.com para confirmar (ou use as credenciais para login direto se a confirmação for desativada).');
        return { success: true };
      }
      
      showError(`Erro de login: ${error.message}`);
      return { success: false };
    }

    showSuccess('Login como Convidado realizado com sucesso!');
    return { success: true };

  } catch (e) {
    showError('Ocorreu um erro inesperado durante o login de convidado.');
    console.error(e);
    return { success: false };
  }
}