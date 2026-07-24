const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function authHeaders(jwt?: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  return headers;
}

/** Retry fetch on 5xx errors with exponential backoff. Max 2 retries. Timeout 8s. */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok || res.status < 500 || i === retries) return res;
      await new Promise(r => setTimeout(r, 200 * (i + 1)));
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError' && i === retries) throw new Error('Timeout');
      if (i === retries) throw err;
    }
  }
  throw new Error('Max retries');
}

import { Product, InventoryResponse, Stats, AlertsResponse, MovementsResponse, AnalyticsResponse } from '@/types';

export async function getInventory(tenantToken: string, jwt?: string): Promise<InventoryResponse> {
  const res = await fetchWithRetry(`${API_URL}/api/inventory?token=${tenantToken}`, {
    cache: 'no-store',
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error('Error cargando inventario');
  return res.json();
}

export async function updateProduct(token: string, product: Partial<Product>, jwt?: string): Promise<Product> {
  const res = await fetchWithRetry(`${API_URL}/api/products/${product.sku}?token=${token}`, {
    method: 'PATCH',
    headers: authHeaders(jwt, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error('Error actualizando producto');
  return res.json();
}

export async function deleteProduct(token: string, sku: string, jwt?: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/api/products/${sku}?token=${token}`, {
    method: 'DELETE',
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error('Error eliminando producto');
}

export async function createProduct(token: string, product: Partial<Product>, jwt?: string): Promise<{status: string; product: Product}> {
  const res = await fetchWithRetry(`${API_URL}/api/products?token=${token}`, {
    method: 'POST',
    headers: authHeaders(jwt, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error('Error creando producto');
  return res.json();
}

export async function getStats(token: string, jwt?: string): Promise<Stats> {
  const res = await fetchWithRetry(`${API_URL}/api/stats?token=${token}`, {
    cache: 'no-store',
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error('Error cargando estadisticas');
  return res.json();
}

export async function getAlerts(token: string, jwt?: string): Promise<AlertsResponse> {
  const res = await fetchWithRetry(`${API_URL}/api/alerts?token=${token}`, {
    cache: 'no-store',
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error('Error cargando alertas');
  return res.json();
}

export async function getMovements(token: string, limit = 10, jwt?: string): Promise<MovementsResponse> {
  const res = await fetchWithRetry(`${API_URL}/api/movements?token=${token}&limit=${limit}`, {
    cache: 'no-store',
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error('Error cargando movimientos');
  return res.json();
}

export async function getAnalytics(token: string, jwt?: string): Promise<AnalyticsResponse> {
  const res = await fetchWithRetry(`${API_URL}/api/analytics?token=${token}`, {
    cache: 'no-store',
    headers: authHeaders(jwt),
  });
  if (!res.ok) throw new Error('Error cargando analitica');
  return res.json();
}
