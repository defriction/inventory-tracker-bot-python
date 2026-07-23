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
  advanced: AdvancedAnalytics;
}

export interface AdvancedAnalytics {
  demand_forecasts: DemandForecast[];
  abc_xyz: AbcXyzItem[];
  seasonality: Seasonality;
  reorder_recommendations: ReorderRecommendation[];
  anomalies: Anomaly[];
  correlations: Correlation[];
  turnover: TurnoverItem[];
  price_insights: PriceInsight[];
}

export interface DemandForecast {
  sku: string;
  forecast: number;
  forecast_7d: number;
  method: string;
  alpha: number;
  daily_avg: number;
  std_dev: number;
  confidence: number;
  trend: string;
}

export interface AbcXyzItem {
  sku: string;
  total_revenue: number;
  total_units: number;
  avg_price: number;
  pct: number;
  abc: string;
  cv: number;
  xyz: string;
  classification: string;
}

export interface Seasonality {
  has_seasonality: boolean;
  monthly_index: Record<string, number>;
  peak_month: string;
  low_month: string;
  strength: number;
}

export interface ReorderRecommendation {
  sku: string;
  name: string;
  current_stock: number;
  daily_demand: number;
  reorder_point: number;
  days_until_reorder: number;
  recommended_order: number;
  service_level: number;
}

export interface Anomaly {
  date: string;
  revenue: number;
  expected: number;
  z_score: number;
  type: 'spike' | 'drop';
}

export interface Correlation {
  product_a: string;
  product_b: string;
  sku_a: string;
  sku_b: string;
  correlation: number;
  strength: string;
}

export interface TurnoverItem {
  sku: string;
  name: string;
  units_sold: number;
  current_stock: number;
  turnover_ratio: number;
  days_to_sell: number;
  efficiency: string;
}

export interface PriceInsight {
  sku: string;
  name: string;
  price: number;
  cost: number;
  margin_pct: number;
  avg_daily_demand: number;
  suggested_action: string;
}
