// Espejo de los modelos del backend Python
export interface Product {
  uuid: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  cost: number;
  price: number;
  expiration_date?: string;
  location?: string;
  invima?: string;
  lote?: string;
}

export interface Tenant {
  pyme_name: string;
  sheet_id: string;
  token: string;
}

export interface InventoryResponse {
  products: Product[];
  total: number;
}

export interface Stats {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  expiring_count: number;
}

export interface AlertItem {
  sku: string;
  name: string;
  stock: number;
  unit: string;
}

export interface ExpiringItem {
  sku: string;
  name: string;
  expiration_date: string;
  days_left: number;
}

export interface AlertsResponse {
  low_stock: AlertItem[];
  expiring: ExpiringItem[];
}

export interface Movement {
  timestamp: string;
  tx_id: string;
  mov_type: string;
  sku: string;
  name: string;
  qty: number;
  user: string;
  notes: string;
}

export interface MovementsResponse {
  movements: Movement[];
  total: number;
}
