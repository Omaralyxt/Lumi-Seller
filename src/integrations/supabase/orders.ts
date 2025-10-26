import { supabase } from './client';
import { showError, showSuccess } from '@/utils/toast';
import { Order, OrderItem } from '@/types/database';

/**
 * Simula a criação de um pedido completo para fins de teste e demonstração.
 * @param storeId O ID da loja do vendedor.
 * @param buyerId O ID do comprador (auth.uid()).
 * @returns O ID do novo pedido ou null em caso de falha.
 */
export async function createTestOrder(storeId: string, buyerId: string): Promise<string | null> {
  const customerResponse = await supabase
    .from('customers')
    .select('id, full_name, email')
    .eq('user_id', buyerId)
    .single();

  if (customerResponse.error || !customerResponse.data) {
    showError("Falha ao encontrar dados do cliente para o pedido de teste.");
    console.error(customerResponse.error);
    return null;
  }

  const customer = customerResponse.data;

  // 1. Inserir o Pedido Principal (orders)
  const orderData: Partial<Order> = {
    store_id: storeId,
    buyer_id: buyerId,
    buyer_name: customer.full_name,
    buyer_email: customer.email,
    buyer_address: 'Rua de Teste, 456',
    buyer_city: 'Maputo',
    buyer_country: 'Mozambique',
    order_number: `ORD-${Date.now()}`,
    status: 'pending',
    payment_method: 'M-Pesa',
    payment_status: 'awaiting_payment',
    total_amount: 1500.00,
    shipping_cost: 50.00,
  };

  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert([orderData])
    .select('id')
    .single();

  if (orderError) {
    showError(`Erro ao criar pedido principal: ${orderError.message}`);
    console.error(orderError);
    return null;
  }

  const orderId = newOrder.id;

  // 2. Inserir Itens do Pedido (order_items)
  const itemsData: Partial<OrderItem>[] = [
    {
      order_id: orderId,
      store_id: storeId,
      product_id: '00000000-0000-0000-0000-000000000001', // Placeholder
      product_name: 'Produto de Teste A',
      variant: 'Tamanho Único',
      quantity: 2,
      price: 700.00,
      subtotal: 1400.00,
    },
    {
      order_id: orderId,
      store_id: storeId,
      product_id: '00000000-0000-0000-0000-000000000002', // Placeholder
      product_name: 'Produto de Teste B',
      variant: 'Cor Vermelha',
      quantity: 1,
      price: 50.00,
      subtotal: 50.00,
    },
  ];

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsData);

  if (itemsError) {
    showError(`Erro ao inserir itens do pedido: ${itemsError.message}`);
    // Nota: Em um cenário real, você faria um rollback do pedido principal aqui.
    return null;
  }

  showSuccess(`Pedido de teste #${orderId.substring(0, 8)} criado com sucesso!`);
  return orderId;
}