'use client';

import { useState, useEffect, useMemo } from 'react';
import { Edit3, Trash2, X, Plus } from 'lucide-react';
import { Product } from '@/types';
import { confirmToast } from '@/lib/confirm';
import { useInventoryStore } from '@/stores/inventoryStore';

const ITEMS_PER_PAGE = 10;

type SortField = 'name' | 'stock' | 'price' | 'category' | 'expiration_date';
type SortDir = 'asc' | 'desc';

export default function InventoryTable({ token, jwt }: { token: string; jwt?: string }) {
  const {
    products, loading, error, highlightSku,
    fetchProducts, createProduct, updateProduct, deleteProduct,
  } = useInventoryStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'General', stock: 0, unit: 'UND', cost: 0, price: 0, expiration_date: '', location: '', invima: '', lote: '', sku: '' });

  useEffect(() => {
    fetchProducts(token, jwt);
  }, [token, jwt]);

  const startEdit = (p: Product) => {
    setEditing(p);
    setEditForm({ name: p.name, category: p.category, stock: p.stock, unit: p.unit, price: p.price, cost: p.cost, expiration_date: p.expiration_date, location: p.location, invima: p.invima, lote: p.lote });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    await updateProduct(token, editing.sku, editForm, jwt);
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async (sku: string, name: string) => {
    const ok = await confirmToast(`¿Eliminar "${name}"?`);
    if (!ok) return;
    await deleteProduct(token, sku, name, jwt);
  };

  const handleCreate = async () => {
    if (!newProduct.name) return;
    setSaving(true);
    await createProduct(token, newProduct, jwt);
    setShowCreate(false);
    setNewProduct({ name: '', category: 'General', stock: 0, unit: 'UND', cost: 0, price: 0, expiration_date: '', location: '', invima: '', lote: '', sku: '' });
    setSearch('');
    setCategoryFilter('');
    setStockFilter('');
    setPage(1);
    setSaving(false);
  };

  // Extraer categorias unicas
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // Filtrar
  const filtered = useMemo(() => {
    let result = [...products];

    // Busqueda texto
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Filtro categoria
    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Filtro stock
    if (stockFilter === 'low') {
      result = result.filter(p => p.stock > 0 && p.stock <= 5);
    } else if (stockFilter === 'out') {
      result = result.filter(p => p.stock <= 0);
    } else if (stockFilter === 'normal') {
      result = result.filter(p => p.stock > 5);
    }

    // Ordenar
    result.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'name': va = a.name; vb = b.name; break;
        case 'stock': va = a.stock; vb = b.stock; break;
        case 'price': va = a.price; vb = b.price; break;
        case 'category': va = a.category; vb = b.category; break;
        case 'expiration_date': va = a.expiration_date || ''; vb = b.expiration_date || ''; break;
        default: return 0;
      }
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return result;
  }, [products, search, categoryFilter, stockFilter, sortField, sortDir]);

  // Paginacion
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, categoryFilter, stockFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-indigo-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

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
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={() => fetchProducts(token, jwt)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Filters bar */}
      <div className="px-6 py-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoria..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg
                text-sm text-gray-900 placeholder-gray-400
                focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              showFilters || categoryFilter || stockFilter
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>🔽</span> Filtros
            {(categoryFilter || stockFilter) && (
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                {(categoryFilter ? 1 : 0) + (stockFilter ? 1 : 0)}
              </span>
            )}
          </button>

          {/* New Product */}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Nuevo
          </button>

          {/* Results count */}
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} de {products.length} productos
          </span>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex gap-3 flex-wrap pt-2 border-t border-gray-100">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700
                focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todas las categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700
                focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todos los stocks</option>
              <option value="low">Stock bajo (1-5)</option>
              <option value="out">Sin stock (0)</option>
              <option value="normal">Stock normal (&gt;5)</option>
            </select>

            {(categoryFilter || stockFilter) && (
              <button
                onClick={() => { setCategoryFilter(''); setStockFilter(''); }}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th
                className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => toggleSort('name')}
              >
                Producto <SortIcon field="name" />
              </th>
              <th
                className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden md:table-cell"
                onClick={() => toggleSort('category')}
              >
                Categoria <SortIcon field="category" />
              </th>
              <th
                className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => toggleSort('stock')}
              >
                Stock <SortIcon field="stock" />
              </th>
              <th
                className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden sm:table-cell"
                onClick={() => toggleSort('price')}
              >
                Precio <SortIcon field="price" />
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Ubicacion
              </th>
              <th
                className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden lg:table-cell"
                onClick={() => toggleSort('expiration_date')}
              >
                Vence <SortIcon field="expiration_date" />
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((product) => (
              <tr key={product.uuid} className={`hover:bg-gray-50/70 transition-colors ${highlightSku === product.sku ? 'animate-pulse bg-indigo-50 ring-2 ring-indigo-300' : ''}`}>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <code className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {product.sku}
                  </code>
                </td>
                <td className="px-6 py-3.5">
                  <p className="text-sm text-gray-900 font-medium truncate max-w-[180px]">
                    {product.name}
                  </p>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap hidden md:table-cell">
                  <span className="text-xs text-gray-500">{product.category}</span>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-right">
                  <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                    product.stock <= 0
                      ? 'text-red-700 bg-red-100'
                      : product.stock <= 5
                      ? 'text-amber-700 bg-amber-100'
                      : 'text-emerald-700 bg-emerald-100'
                  }`}>
                    {product.stock <= 0 && '⚫ '}
                    {product.stock > 0 && product.stock <= 5 && '🟡 '}
                    {product.stock} {product.unit}
                  </span>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-right hidden sm:table-cell">
                  <span className="text-sm text-gray-700 font-mono font-medium">
                    ${product.price.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap hidden lg:table-cell">
                  <span className="text-xs text-gray-500">{product.location || <span className="text-gray-300">—</span>}</span>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap hidden lg:table-cell">
                  {product.expiration_date ? (
                    <span className={`text-xs font-medium ${
                      new Date(product.expiration_date) < new Date() ? 'text-red-600 font-semibold' : 'text-gray-500'
                    }`}>
                      {product.expiration_date}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-2 py-3.5 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => startEdit(product)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(product.sku, product.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <span className="text-5xl block mb-4">📭</span>
          <p className="text-sm text-gray-400 font-medium">
            {search || categoryFilter || stockFilter
              ? 'Sin resultados con los filtros actuales'
              : 'Inventario vacio'}
          </p>
          {(search || categoryFilter || stockFilter) && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter(''); setStockFilter(''); }}
              className="mt-3 text-xs text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-gray-400">
            Pagina {page} de {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ⏮
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Anterior
            </button>

            {generatePages(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="px-1 text-gray-400 text-xs">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-8 h-8 text-xs rounded-md font-medium transition-colors ${
                    page === p
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-xs rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ⏭
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Editar {editing.name}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                  <input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                  <input value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                  <input type="number" value={editForm.stock || 0} onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unidad</label>
                  <input value={editForm.unit || ''} onChange={e => setEditForm({...editForm, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Precio</label>
                  <input type="number" value={editForm.price || 0} onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Costo</label>
                  <input type="number" value={editForm.cost || 0} onChange={e => setEditForm({...editForm, cost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ubicacion</label>
                  <input value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vencimiento</label>
                  <input type="date" value={editForm.expiration_date || ''} onChange={e => setEditForm({...editForm, expiration_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">INVIMA</label>
                  <input value={editForm.invima || ''} onChange={e => setEditForm({...editForm, invima: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lote</label>
                <input value={editForm.lote || ''} onChange={e => setEditForm({...editForm, lote: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <button onClick={saveEdit} disabled={saving}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Producto</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                  <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="Nombre del producto" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SKU (opcional)</label>
                  <input value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="Auto-generado" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                  <input value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unidad</label>
                  <input value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                  <input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Precio</label>
                  <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Costo</label>
                  <input type="number" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vencimiento</label>
                  <input type="date" value={newProduct.expiration_date} onChange={e => setNewProduct({...newProduct, expiration_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ubicacion</label>
                  <input value={newProduct.location} onChange={e => setNewProduct({...newProduct, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">INVIMA</label>
                  <input value={newProduct.invima} onChange={e => setNewProduct({...newProduct, invima: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lote</label>
                  <input value={newProduct.lote} onChange={e => setNewProduct({...newProduct, lote: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <button onClick={handleCreate} disabled={!newProduct.name || saving}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                {saving ? 'Creando...' : 'Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function generatePages(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
