import { Product, InventoryResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://inventory-api.defriction.org';

export async function getInventory(tenantToken: string): Promise<InventoryResponse> {
  const res = await fetch(`${API_URL}/api/inventory?token=${tenantToken}`, {
    next: { revalidate: 30 }, // Cache 30s
  });
  
  if (!res.ok) {
    throw new Error('Error cargando inventario');
  }
  
  return res.json();
}

export async function updateProduct(token: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${product.sku}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });
  
  if (!res.ok) {
    throw new Error('Error actualizando producto');
  }
  
  return res.json();
}
