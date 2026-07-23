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
    const fetchData = () => {
      getInventory(token)
        .then((data) => {
          setProducts(data.products);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8">
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <span className="text-3xl block mb-3">⚠️</span>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o categoria..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg
              text-sm text-gray-900 placeholder-gray-400
              focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
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
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">SKU</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Producto</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Categoria</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Stock</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Precio</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Ubicacion</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Vence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((product) => (
              <tr key={product.uuid} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 whitespace-nowrap">
                  <code className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{product.sku}</code>
                </td>
                <td className="px-6 py-3">
                  <p className="text-sm text-gray-900 font-medium truncate max-w-[200px]">{product.name}</p>
                </td>
                <td className="px-6 py-3 whitespace-nowrap hidden md:table-cell">
                  <span className="text-xs text-gray-500">{product.category}</span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-right">
                  <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${
                    product.stock <= 0
                      ? 'text-red-700 bg-red-100'
                      : product.stock <= 5
                      ? 'text-amber-700 bg-amber-100'
                      : 'text-emerald-700 bg-emerald-100'
                  }`}>
                    {product.stock} {product.unit}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-right hidden sm:table-cell">
                  <span className="text-sm text-gray-600 font-mono">${product.price.toLocaleString()}</span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap hidden lg:table-cell">
                  <span className="text-xs text-gray-500">{product.location || '—'}</span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap hidden lg:table-cell">
                  {product.expiration_date ? (
                    <span className={`text-xs font-medium ${new Date(product.expiration_date) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>
                      {product.expiration_date}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <span className="text-4xl block mb-4">📭</span>
          <p className="text-sm text-gray-400">{search ? 'Sin resultados para tu busqueda' : 'Inventario vacio'}</p>
          {search && <p className="text-xs text-gray-300 mt-1">Intenta con otro termino</p>}
        </div>
      )}

      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">{filtered.length} de {products.length} productos</p>
      </div>
    </div>
  );
}
