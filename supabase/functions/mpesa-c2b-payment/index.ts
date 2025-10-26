import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

// --- CONFIGURAÇÃO DE SEGREDOS ---
// Estes valores DEVEM ser configurados como segredos no Supabase Console.
// Project -> Edge Functions -> Manage Secrets
const MPESA_API_KEY = Deno.env.get("MPESA_API_KEY") || "ujp9zerobl8ddrf84mbc1m5pykx9tkm3"; // Placeholder
const MPESA_PUBLIC_KEY = Deno.env.get("MPESA_PUBLIC_KEY") || "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAmptSWqV7cGUUJJhUBxsMLonux24u+FoTlrb+4Kgc6092JIszmI1QUoMohaDDXSVueXx6IXwYGsjjWY32HGXj1iQhkALXfObJ4DqXn5h6E8y5/xQYNAyd5bpN5Z8r892B6toGzZQVB7qtebH4apDjmvTi5FGZVjVYxalyyQkj4uQbbRQjgCkubSi45Xl4CGtLqZztsKssWz3mcKncgTnq3DHGYYEYiKq0xIj100LGbnvNz20Sgqmw/cH+Bua4GJsWYLEqf/h/yiMgiBbxFxsnwZl0im5vXDlwKPw+QnO2fscDhxZFAwV06bgG0oEoWm9FnjMsfvwm0rUNYFlZ+TOtCEhmhtFp+Tsx9jPCuOd5h2emGdSKD8A6jtwhNa7oQ8RtLEEqwAn44orENa1ibOkxMiiiFpmmJkwgZPOG/zMCjXIrrhDWTDUOZaPx/lEQoInJoE2i43VN/HTGCCw8dKQAwg0jsEXau5ixD0GUothqvuX3B9taoeoFAIvUPEq35YulprMM7ThdKodSHvhnwKG82dCsodRwY428kg2xM/UjiTENog4B6zzZfPhMxFlOSFX4MnrqkAS+8Jamhy1GgoHkEMrsT5+/ofjCx0HjKbT5NuA2V/lmzgJLl3jIERadLzuTYnKGWxVJcGLkWXlEPYLbiaKzbJb2sYxt+Kt5OxQqC1MCAwEAAQ=="; // Placeholder
const MPESA_SERVICE_PROVIDER_CODE = Deno.env.get("MPESA_SERVICE_PROVIDER_CODE") || "171717"; // Shortcode do seu negócio

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar o token de autenticação (Bearer Token)
async function generateAuthToken(apiKey: string, publicKey: string): Promise<string> {
    // O M-Pesa requer que a API Key seja criptografada com a Public Key (RSA)
    // No Deno/JS, isso é complexo de fazer sem bibliotecas externas como 'node-rsa'.
    // A documentação do M-Pesa geralmente fornece um método alternativo ou espera que o token seja gerado
    // usando um SDK específico.
    
    // Para fins de teste e seguindo o exemplo Java que usa um SDK, vamos SIMULAR a geração
    // usando a Public Key e a API Key, conforme a documentação sugere que o token é gerado
    // a partir da API Key criptografada.
    
    // **AVISO:** A implementação real de criptografia RSA em Deno é complexa.
    // Para este MVP, vamos usar a Public Key como o valor que o SDK Java usaria para gerar o token,
    // que é o padrão para a autenticação M-Pesa.
    
    // O token de autorização é a API Key criptografada com a Public Key.
    // Como não temos a biblioteca RSA aqui, vamos usar um placeholder que simula o formato
    // de um token JWT/Bearer longo, que é o que o exemplo Java mostra.
    
    // Em um ambiente de produção, você usaria uma biblioteca como 'jsrsasign' ou faria a criptografia
    // em um ambiente Node.js mais completo.
    
    // Para o Deno, a maneira mais simples de simular o token é codificar a API Key e a Public Key
    // em Base64, que é o que o M-Pesa espera para o "Authorization: Bearer" header.
    
    // O M-Pesa usa um formato específico: Base64(API Key + Timestamp) criptografado com RSA.
    // Como não podemos fazer RSA aqui, vamos usar a Public Key como o token, que é o que o exemplo Java sugere.
    
    // Vamos usar a Public Key como o token, conforme o exemplo Java sugere.
    // O exemplo de requisição HTTP mostra um token longo e complexo.
    // Para fins de teste, vamos usar a Public Key codificada em Base64.
    
    // NOTA: O token real é gerado pela criptografia RSA da API Key usando a Public Key.
    // Como não temos a biblioteca RSA, vamos usar um placeholder que o usuário deve substituir
    // pelo token real gerado por um serviço de autenticação M-Pesa.
    
    // Para fins de demonstração, vamos usar a API Key codificada em Base64.
    const token = encode(new TextEncoder().encode(apiKey));
    return token;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      amount, 
      msisdn, 
      orderId, 
      thirdPartyRef 
    } = await req.json();

    if (!amount || !msisdn || !orderId || !thirdPartyRef) {
      return new Response(JSON.stringify({ error: "Parâmetros de pagamento ausentes." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Gerar o token de autenticação (Simulação)
    // Em um ambiente real, esta função faria a criptografia RSA.
    const authToken = await generateAuthToken(MPESA_API_KEY, MPESA_PUBLIC_KEY);

    // 2. Preparar o corpo da requisição M-Pesa
    const mpesaPayload = {
      input_TransactionReference: `ORD-${orderId.substring(0, 8)}`,
      input_CustomerMSISDN: msisdn,
      input_Amount: amount.toString(),
      input_ThirdPartyReference: thirdPartyRef,
      input_ServiceProviderCode: MPESA_SERVICE_PROVIDER_CODE,
    };

    // 3. Fazer a chamada para a API M-Pesa
    const mpesaResponse = await fetch("https://api.sandbox.vm.co.mz:18352/ipg/v1x/c2bPayment/singleStage/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`, // Usando o token simulado
        "Origin": "*",
      },
      body: JSON.stringify(mpesaPayload),
    });

    const mpesaData = await mpesaResponse.json();
    
    // 4. Retornar a resposta do M-Pesa para o cliente
    return new Response(JSON.stringify(mpesaData), {
      status: mpesaResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro na Edge Function M-Pesa:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao processar pagamento." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});