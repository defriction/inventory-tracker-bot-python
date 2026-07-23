import { Product, InventoryResponse, Stats, AlertsResponse, MovementsResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function getInventory(tenantToken: string): Promise<InventoryResponse> {
  const res = await fetch(`${API_URL}/api/inventory?token=${tenantToken}`, {
    next: { revalidate: 30 },
  });
  
  if (!res.ok) {
    throw new Error('Error cargando inventario');
  }
  
  return res.json();
}

export async function updateProduct(token: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${product.sku}?token=${token}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });
  
  if (!res.ok) {
    throw new Error('Error actualizando producto');
  }
  
  return res.json();
}

export async function getStats(token: string): Promise<Stats> {
  const res = await fetch(`${API_URL}/api/stats?token=${token}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error('Error cargando estadisticas');
  return res.json();
}

export async function getAlerts(token: string): Promise<AlertsResponse> {
  const res = await fetch(`${API_URL}/api/alerts?token=${token}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error('Error cargando alertas');
  return res.json();
}

export async function getMovements(token: string, limit = 10): Promise<MovementsResponse> {
  const res = await fetch(`${API_URL}/api/movements?token=${token}&limit=${limit}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error('Error cargando movimientos');
  return res.json();
}
