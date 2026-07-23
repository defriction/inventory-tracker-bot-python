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
