import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inicializa o cliente Supabase com a Service Role Key para acesso irrestrito ao DB
// Isso é necessário para que o webhook possa atualizar o status do pedido sem autenticação de usuário.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mpesaResult = await req.json();
    console.log("Webhook M-Pesa Recebido:", mpesaResult);

    const resultCode = mpesaResult.input_ResultCode;
    const thirdPartyRef = mpesaResult.input_ThirdPartyReference;
    const transactionId = mpesaResult.input_TransactionID;
    const conversationId = mpesaResult.input_OriginalConversationID;

    // 1. Determinar o status do pedido
    let newStatus: 'paid' | 'canceled' | 'pending' = 'pending';
    let paymentStatus: 'paid' | 'failed' | 'awaiting_payment' = 'awaiting_payment';

    if (resultCode === "0") {
      newStatus = 'paid';
      paymentStatus = 'paid';
    } else {
      newStatus = 'canceled';
      paymentStatus = 'failed';
    }

    // 2. Extrair o ID do pedido (Assumindo que thirdPartyRef contém o ID do pedido ou uma referência rastreável)
    // NOTA: O ThirdPartyReference deve ser o ID do pedido ou um valor que permita a busca.
    // Para este exemplo, vamos assumir que o ThirdPartyReference é o ID do pedido.
    // Em um sistema real, você usaria uma tabela de transações para mapear.
    
    // Vamos tentar buscar o pedido usando o ThirdPartyReference (que deve ser o order_number)
    const { data: orderData, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('order_number', thirdPartyRef)
        .single();

    if (fetchError || !orderData) {
        console.error("Erro: Pedido não encontrado com ThirdPartyReference:", thirdPartyRef);
        // Responder ao M-Pesa que recebemos, mas logar o erro
        return new Response(JSON.stringify({
            output_OriginalConversationID: conversationId,
            output_ResponseDesc: "Successfully Accepted Result, but Order not found",
            output_ResponseCode: "0",
            output_ThirdPartyConversationID: thirdPartyRef,
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    const orderId = orderData.id;

    // 3. Atualizar o status do pedido no banco de dados
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: newStatus, 
        payment_status: paymentStatus,
        mpesa_transaction_id: transactionId, // Assumindo que adicionaremos esta coluna
      })
      .eq('id', orderId);

    if (updateError) {
      console.error("Erro ao atualizar status do pedido:", updateError);
      // Responder ao M-Pesa que recebemos, mas logar o erro
    }

    // 4. Responder ao M-Pesa (API Async Result Response)
    return new Response(JSON.stringify({
      output_OriginalConversationID: conversationId,
      output_ResponseDesc: "Successfully Accepted Result",
      output_ResponseCode: "0",
      output_ThirdPartyConversationID: thirdPartyRef,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro no Webhook M-Pesa:", error);
    return new Response(JSON.stringify({ error: "Erro interno no webhook." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});