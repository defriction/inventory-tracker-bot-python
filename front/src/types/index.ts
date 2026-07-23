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

export interface TopSeller {
  sku: string;
  name: string;
  units_sold: number;
  revenue: number;
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
}

export interface AbcItem {
  sku: string;
  name: string;
  revenue: number;
  pct: number;
  class: string;
}

export interface MarginItem {
  sku: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  margin_pct: number;
  stock: number;
}

export interface StockHealth {
  out_of_stock: number;
  low_stock: number;
  expiring: number;
}

export interface AnalyticsResponse {
  top_sellers: TopSeller[];
  category_breakdown: CategoryBreakdown[];
  sales_trend: SalesTrendPoint[];
  abc_classification: AbcItem[];
  margins: MarginItem[];
  stock_health: StockHealth;
  recommendations: string[];
  total_revenue_90d: number;
  total_units_sold_90d: number;
}
