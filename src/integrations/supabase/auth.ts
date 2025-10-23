import { supabase } from './client';
import { showSuccess, showError } from '@/utils/toast';

const GUEST_EMAIL = 'guest@lumiseller.com';
const GUEST_PASSWORD = 'guestpassword';

/**
 * Tenta fazer login como convidado. Se a conta não existir, tenta criá-la e logar.
 * @returns { success: boolean }
 */
export async function signInAsGuest() {
  try {
    // 1. Tenta fazer login com credenciais de teste predefinidas
    let { error } = await supabase.auth.signInWithPassword({
      email: GUEST_EMAIL,
      password: GUEST_PASSWORD,
    });

    if (error) {
      // Se o login falhar (ex: usuário não existe ou não está confirmado), tenta criar o usuário
      if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
        showSuccess('Conta de convidado não encontrada. Tentando criar...');
        
        const { error: signUpError } = await supabase.auth.signUp({
          email: GUEST_EMAIL,
          password: GUEST_PASSWORD,
          options: {
            data: {
              first_name: 'Convidado',
              last_name: 'Lumi',
              role: 'seller', // Define a role como seller
            },
          },
        });

        if (signUpError) {
          // Se o erro for que o usuário já existe, tentamos logar novamente (caso o erro anterior fosse 'Email not confirmed')
          if (signUpError.message.includes('User already registered')) {
             showSuccess('Conta já existe. Tentando login novamente...');
             ({ error } = await supabase.auth.signInWithPassword({
                email: GUEST_EMAIL,
                password: GUEST_PASSWORD,
             }));
          } else {
            showError(`Erro ao criar conta de convidado: ${signUpError.message}`);
            return { success: false };
          }
        } else {
            // Se o cadastro foi bem-sucedido, tentamos logar imediatamente (útil se a confirmação de email estiver desativada)
            showSuccess('Conta de convidado criada. Fazendo login...');
            ({ error } = await supabase.auth.signInWithPassword({
                email: GUEST_EMAIL,
                password: GUEST_PASSWORD,
            }));
        }
      }
      
      // Verifica o erro final após todas as tentativas
      if (error) {
        showError(`Falha no Login de Convidado: ${error.message}`);
        return { success: false };
      }
    }

    showSuccess('Login como Convidado realizado com sucesso!');
    return { success: true };

  } catch (e) {
    showError('Ocorreu um erro inesperado durante o login de convidado.');
    console.error(e);
    return { success: false };
  }
}