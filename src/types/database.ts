// Tipagem para ProductImage
export interface ProductImage {
  id: string;
  product_id: string;
  store_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

// Tipagem para Specification
export interface Specification {
  id: string; // UUID temporário para o frontend
  name: string; // Ex: "Peso", "Memória RAM"
  value: string; // Ex: "200g", "8 GB"
}

// Tipagem para Imagens de Descrição Detalhada
export interface DetailedImage {
  url: string;
  sort_order: number;
}

// Tipagem base para Product
export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string; // Alterado de string | null para string
  shipping_cost: number | null;
  specifications: Specification[] | null; // Novo campo JSONB
  video_url: string | null; // Novo campo para URL do vídeo
  detailed_images: DetailedImage[] | null; // Novo campo JSONB para imagens de descrição
  created_at: string;
}

// Tipagem para ProductVariant
export interface ProductVariant {
  id: string;
  product_id: string;
  store_id: string;
  name: string; // Ex: "Tamanho P, Cor Azul"
  price: number; // Em Metical (MZN)
  stock: number;
  cut_price: number | null; // Novo campo para preço de corte/promoção
  created_at: string;
  // Adicionando imagens para a variante (para o frontend)
  images?: ProductImage[]; 
}

// Tipagem para Order
export interface Order {
  id: string;
  store_id: string; // Adicionado para consistência, embora já esteja no DB
  customer_id: string | null;
  total_amount: number;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'canceled'; // Novos status
  tracking_code: string | null; // Novo campo
  payment_method: string | null; // Novo campo
  created_at: string;
  order_number: string | null;
}

// Tipagem para OrderItem
export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number; // Corrigido de price_at_purchase para price
}

// Tipagem para Customer
export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  shipping_address: string;
  city: string;
  state: string;
  zip_code: string;
}

// Tipagem para Notification
export interface Notification {
  id: string;
  store_id: string | null;
  order_id: string | null;
  type: 'new_order' | 'status_update' | 'system';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}