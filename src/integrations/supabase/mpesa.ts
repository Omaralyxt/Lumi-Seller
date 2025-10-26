import { supabase } from './client';
import { showError, showSuccess } from '@/utils/toast';

interface MpesaPaymentParams {
  amount: number;
  msisdn: string;
  orderId: string;
  thirdPartyRef: string; // Geralmente o número do pedido
}

/**
 * Inicia uma transação M-Pesa C2B chamando a Edge Function.
 * @returns A resposta síncrona da API M-Pesa.
 */
export async function initiateMpesaPayment({ amount, msisdn, orderId, thirdPartyRef }: MpesaPaymentParams) {
  try {
    const { data, error } = await supabase.functions.invoke('mpesa-c2b-payment', {
      body: {
        amount: amount,
        msisdn: msisdn,
        orderId: orderId,
        thirdPartyRef: thirdPartyRef,
      },
    });

    if (error) {
      showError(`Erro ao iniciar pagamento M-Pesa: ${error.message}`);
      return { success: false, error: error.message };
    }

    // A Edge Function retorna a resposta da API M-Pesa
    const mpesaResponse = data;
    
    if (mpesaResponse.output_ResponseCode === "0") {
        showSuccess("Pagamento M-Pesa iniciado! Verifique seu telefone para a notificação USSD Push.");
        return { success: true, response: mpesaResponse };
    } else {
        // Tratar erros síncronos da API M-Pesa
        const errorDesc = mpesaResponse.output_ResponseDesc || "Erro desconhecido na API M-Pesa.";
        showError(`Falha no M-Pesa: ${errorDesc}`);
        return { success: false, error: errorDesc };
    }

  } catch (e) {
    console.error("Erro inesperado ao invocar Edge Function:", e);
    showError("Erro de comunicação com o servidor de pagamento.");
    return { success: false, error: "Erro de comunicação." };
  }
}