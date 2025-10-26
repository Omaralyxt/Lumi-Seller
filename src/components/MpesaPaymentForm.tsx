import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap } from 'lucide-react';
import { initiateMpesaPayment } from '@/integrations/supabase/mpesa';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface MpesaPaymentFormProps {
  orderId: string;
  orderNumber: string;
  amount: number;
  onPaymentInitiated?: () => void;
}

const MpesaPaymentForm: React.FC<MpesaPaymentFormProps> = ({ orderId, orderNumber, amount, onPaymentInitiated }) => {
  const [msisdn, setMsisdn] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!msisdn || msisdn.length < 9) {
      showError("Por favor, insira um número de telefone M-Pesa válido.");
      return;
    }

    setIsLoading(true);
    
    // O ThirdPartyReference deve ser o orderNumber para que o webhook possa rastrear
    const thirdPartyRef = orderNumber; 

    const result = await initiateMpesaPayment({
      amount: amount,
      msisdn: msisdn,
      orderId: orderId,
      thirdPartyRef: thirdPartyRef,
    });

    setIsLoading(false);

    if (result.success && onPaymentInitiated) {
      onPaymentInitiated();
    }
  };

  return (
    <Card className={cn(
        "rounded-xl border-green-500/50 hover:ring-2 hover:ring-green-500/50 transition-all duration-300 neon-glow"
    )}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-xl flex items-center text-green-600">
          <Zap className="h-5 w-5 mr-2" /> Pagamento M-Pesa
        </CardTitle>
        {/* Logo M-Pesa (Simulação) */}
        <div className="text-2xl font-bold text-red-600">M-Pesa</div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor a Pagar</Label>
            <Input 
              id="amount"
              value={`MZN ${amount.toFixed(2)}`}
              disabled
              className="font-sans text-lg font-bold text-primary rounded-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="msisdn">Número de Telefone M-Pesa (258...)</Label>
            <Input 
              id="msisdn"
              type="tel"
              placeholder="Ex: 25884XXXXXXX"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
              disabled={isLoading}
              className="font-sans rounded-lg"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full font-heading rounded-xl bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading || amount <= 0}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Zap className="mr-2 h-5 w-5" />
            )}
            {isLoading ? "Aguardando Push..." : `Pagar MZN ${amount.toFixed(2)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MpesaPaymentForm;