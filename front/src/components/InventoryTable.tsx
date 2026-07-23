'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { getInventory } from '@/lib/api';

export default function InventoryTable({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getInventory(token)
      .then((data) => {
        setProducts(data.products);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-8">
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] backdrop-blur-xl p-8 text-center">
        <span className="text-3xl block mb-3">⚠️</span>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
      {/* Search */}
      <div className="px-6 py-4 border-b border-white/[0.05]">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#62666d]">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o categoría..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg
              text-sm text-[#f7f8f8] placeholder-[#62666d]
              focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
              transition-all duration-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider">
                SKU
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider">
                Producto
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider hidden md:table-cell">
                Categoría
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider">
                Stock
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider hidden sm:table-cell">
                Precio
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider hidden lg:table-cell">
                Ubicación
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider hidden lg:table-cell">
                Vence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filtered.map((product) => (
              <tr
                key={product.uuid}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-3 whitespace-nowrap">
                  <code className="text-xs font-medium text-[#d0d6e0] bg-white/[0.05] px-2 py-0.5 rounded">
                    {product.sku}
                  </code>
                </td>
                <td className="px-6 py-3">
                  <p className="text-sm text-[#f7f8f8] font-medium truncate max-w-[200px]">
                    {product.name}
                  </p>
                </td>
                <td className="px-6 py-3 whitespace-nowrap hidden md:table-cell">
                  <span className="text-xs text-[#8a8f98]">{product.category}</span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-right">
                  <span
                    className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${
                      product.stock <= 0
                        ? 'text-red-400 bg-red-500/10'
                        : product.stock <= 5
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-emerald-400 bg-emerald-500/10'
                    }`}
                  >
                    {product.stock} {product.unit}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-right hidden sm:table-cell">
                  <span className="text-sm text-[#d0d6e0] font-mono">
                    ${product.price.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap hidden lg:table-cell">
                  <span className="text-xs text-[#8a8f98]">
                    {product.location || '—'}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap hidden lg:table-cell">
                  {product.expiration_date ? (
                    <span
                      className={`text-xs font-medium ${
                        new Date(product.expiration_date) < new Date()
                          ? 'text-red-400'
                          : 'text-[#8a8f98]'
                      }`}
                    >
                      {product.expiration_date}
                    </span>
                  ) : (
                    <span className="text-xs text-[#62666d]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <span className="text-4xl block mb-4">📭</span>
          <p className="text-sm text-[#8a8f98]">
            {search ? 'Sin resultados para tu búsqueda' : 'Inventario vacío'}
          </p>
          {search && (
            <p className="text-xs text-[#62666d] mt-1">
              Intenta con otro término
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/[0.05] flex items-center justify-between">
        <p className="text-xs text-[#62666d]">
          {filtered.length} de {products.length} productos
        </p>
      </div>
    </div>
  );
}
