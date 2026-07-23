'use client';

import { useState, useEffect } from 'react';
import { Search, FileText, Download, X, Plus, Minus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { getInventory } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface POItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  current_stock: number;
}

export default function PurchaseOrderBuilder({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<POItem[]>([]);
  const [supplier, setSupplier] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showLowStock, setShowLowStock] = useState(true);

  useEffect(() => {
    getInventory(token).then(d => setProducts(d.products)).finally(() => setLoading(false));
  }, [token]);

  const addItem = (product: Product) => {
    if (selected.find(s => s.sku === product.sku)) return;
    const recQty = product.stock <= 5 ? Math.max(10, (5 - product.stock) * 3) : 1;
    setSelected([...selected, { sku: product.sku, name: product.name, quantity: recQty, unit: product.unit, unit_price: product.cost || product.price, current_stock: product.stock }]);
  };

  const removeItem = (sku: string) => setSelected(selected.filter(s => s.sku !== sku));

  const updateQty = (sku: string, qty: number) => {
    setSelected(selected.map(s => s.sku === sku ? { ...s, quantity: Math.max(1, qty) } : s));
  };

  const updatePrice = (sku: string, price: number) => {
    setSelected(selected.map(s => s.sku === sku ? { ...s, unit_price: price } : s));
  };

  const total = selected.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const generatePDF = async () => {
    if (!supplier || selected.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/generate-pdf?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier, order_number: orderNumber, notes, items: selected.map(s => ({ sku: s.sku, name: s.name, quantity: s.quantity, unit: s.unit, unit_price: s.unit_price })) }),
      });
      const data = await res.json();
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdf_base64}`;
      link.download = data.filename;
      link.click();
    } catch (e) { alert('Error generando PDF'); }
    finally { setGenerating(false); }
  };

  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())) &&
    (!showLowStock || p.stock <= 10)
  ).sort((a, b) => a.stock - b.stock);

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(5)].map((_,i)=><div key={i} className="h-12 bg-white rounded-xl"/>)}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Product List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" /> Inventario Disponible
          </h3>
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <button onClick={() => setShowLowStock(!showLowStock)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${showLowStock ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              <AlertTriangle className="w-3.5 h-3.5" /> {showLowStock ? 'Solo bajo stock' : 'Todos'}
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
          {filtered.map(p => {
            const alreadySelected = selected.find(s => s.sku === p.sku);
            return (
              <button key={p.uuid} onClick={() => !alreadySelected && addItem(p)}
                disabled={!!alreadySelected}
                className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${alreadySelected ? 'opacity-40 bg-indigo-50/30' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.sku} · Stock: <span className={p.stock <= 5 ? 'text-red-500 font-semibold' : ''}>{p.stock} {p.unit}</span></p>
                </div>
                <span className="text-xs text-indigo-600 font-medium shrink-0 ml-3">{alreadySelected ? 'Agregado' : '+ Agregar'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Order Builder */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Orden de Compra
          </h3>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <input type="text" placeholder="Proveedor *" value={supplier} onChange={e => setSupplier(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            <input type="text" placeholder="# Orden (opcional)" value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {selected.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Selecciona productos del inventario</p>
            <p className="text-xs text-gray-400 mt-1">Haz clic en "+ Agregar" para incluirlos en la orden</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto">
            {selected.map(item => (
              <div key={item.sku} className="px-5 py-3 flex items-center gap-3">
                <button onClick={() => removeItem(item.sku)} className="shrink-0 p-1 text-gray-400 hover:text-red-500 rounded"><X className="w-3.5 h-3.5" /></button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{item.sku} · Stock actual: {item.current_stock}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.sku, item.quantity - 1)} className="p-0.5 text-gray-400 hover:text-gray-600"><Minus className="w-3 h-3" /></button>
                  <input type="number" value={item.quantity} onChange={e => updateQty(item.sku, parseInt(e.target.value) || 1)}
                    className="w-14 text-center text-sm border border-gray-200 rounded-md py-1 focus:outline-none focus:border-indigo-500" />
                  <button onClick={() => updateQty(item.sku, item.quantity + 1)} className="p-0.5 text-gray-400 hover:text-gray-600"><Plus className="w-3 h-3" /></button>
                </div>
                <input type="number" value={item.unit_price} onChange={e => updatePrice(item.sku, parseInt(e.target.value) || 0)}
                  className="w-20 text-right text-sm border border-gray-200 rounded-md py-1 px-2 focus:outline-none focus:border-indigo-500" placeholder="Precio" />
                <span className="text-xs text-gray-500 w-16 text-right font-mono">${(item.quantity * item.unit_price).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <textarea placeholder="Notas para el proveedor..." value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500" rows={2} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Total: ${total.toLocaleString()}</span>
              <button onClick={generatePDF} disabled={!supplier || generating}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm">
                <Download className="w-4 h-4" /> {generating ? 'Generando...' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
