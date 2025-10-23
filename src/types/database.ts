// Tipagem base para Product
export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string | null;
  shipping_cost: number | null;
  image_url: string | null;
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
  created_at: string;
}

// Tipagem para Order
export interface Order {
  id: string;
  customer_id: string | null;
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  created_at: string;
}

// Tipagem para OrderItem
export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
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