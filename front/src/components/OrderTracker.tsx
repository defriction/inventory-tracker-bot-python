'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Truck, X, Edit3, Trash2, ExternalLink, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Order, OrdersResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const STATUS_OPTIONS = ['pendiente', 'en_transito', 'entregado', 'cancelado'];
const STATUS_ICONS: Record<string, any> = {
  pendiente: Clock, en_transito: Truck, entregado: CheckCircle2, cancelado: AlertCircle,
};
const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
  en_transito: 'bg-blue-100 text-blue-700 border-blue-200',
  entregado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
};

export default function OrderTracker({ token, jwt }: { token: string; jwt?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ order_number: '', supplier: '', product_name: '', quantity: 1, tracking_number: '', shipping_company: '', tracking_url: '', status: 'pendiente', notes: '' });

  const headers = (extra?: Record<string, string>) => {
    const h: Record<string, string> = { ...extra };
    if (jwt) h['Authorization'] = `Bearer ${jwt}`;
    return h;
  };

  const fetchOrders = () => {
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    fetch(`${API_URL}/api/orders?token=${token}&${params}`, { headers: headers() })
      .then(r => r.json())
      .then((d: OrdersResponse) => { setOrders(d.orders); setStats(d.stats.by_status || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); const i = setInterval(fetchOrders, 60000); return () => clearInterval(i); }, [token, statusFilter]);

  const saveOrder = async () => {
    const url = editing ? `${API_URL}/api/orders/${editing.id}?token=${token}` : `${API_URL}/api/orders?token=${token}`;
    const method = editing ? 'PATCH' : 'POST';
    await fetch(url, { method, headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); setForm({ order_number: '', supplier: '', product_name: '', quantity: 1, tracking_number: '', shipping_company: '', tracking_url: '', status: 'pendiente', notes: '' });
    fetchOrders();
  };

  const deleteOrder = async (id: number) => {
    if (!confirm('Eliminar este pedido?')) return;
    await fetch(`${API_URL}/api/orders/${id}?token=${token}`, { method: 'DELETE', headers: headers() });
    fetchOrders();
  };

  const updateStatus = async (order: Order, newStatus: string) => {
    await fetch(`${API_URL}/api/orders/${order.id}?token=${token}`, { method: 'PATCH', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ status: newStatus }) });
    fetchOrders();
  };

  const startEdit = (o: Order) => {
    setEditing(o);
    setForm({ order_number: o.order_number, supplier: o.supplier, product_name: o.product_name, quantity: o.quantity, tracking_number: o.tracking_number, shipping_company: o.shipping_company, tracking_url: o.tracking_url, status: o.status, notes: o.notes });
    setShowForm(true);
  };

  const filtered = orders.filter(o =>
    (!search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.supplier.toLowerCase().includes(search.toLowerCase()) || o.product_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.map(s => {
          const Icon = STATUS_ICONS[s];
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`rounded-xl border p-4 text-left transition-all ${statusFilter === s ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:shadow-sm'} ${STATUS_COLORS[s]}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider">{s.replace('_', ' ')}</span>
                <Icon className="w-4 h-4 opacity-60" />
              </div>
              <div className="text-2xl font-bold mt-1">{stats[s] || 0}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por numero, proveedor o producto..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <button onClick={() => { setEditing(null); setForm({ order_number: '', supplier: '', product_name: '', quantity: 1, tracking_number: '', shipping_company: '', tracking_url: '', status: 'pendiente', notes: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo Pedido
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay pedidos{statusFilter ? ` en estado "${statusFilter}"` : ''}</p>
          <button onClick={() => { setShowForm(true); setStatusFilter(''); }} className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-500">Crear primer pedido</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const Icon = STATUS_ICONS[order.status] || Clock;
            return (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-bold text-gray-900 font-mono">{order.order_number}</h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                        <Icon className="w-3 h-3" /> {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{order.supplier}</p>
                    {order.product_name && <p className="text-xs text-gray-500 mt-0.5">{order.product_name} x {order.quantity}</p>}
                    {order.tracking_number && (
                      <div className="flex items-center gap-2 mt-2">
                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">{order.shipping_company}: {order.tracking_number}</span>
                        {order.tracking_url && (
                          <a href={order.tracking_url} target="_blank" rel="noopener" className="text-indigo-600 hover:text-indigo-500">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                    {order.notes && <p className="text-xs text-gray-400 mt-1.5 italic">{order.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select value={order.status} onChange={e => updateStatus(order, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:border-indigo-500">
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <button onClick={() => startEdit(order)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => deleteOrder(order.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Editar Pedido' : 'Nuevo Pedido'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Numero de Pedido *</label>
                  <input value={form.order_number} onChange={e => setForm({...form, order_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="OC-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor *</label>
                  <input value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="Proveedor XYZ" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Producto</label>
                  <input value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Empresa de Transporte</label>
                <input value={form.shipping_company} onChange={e => setForm({...form, shipping_company: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="Servientrega, Envia, etc." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Numero de Guia</label>
                  <input value={form.tracking_number} onChange={e => setForm({...form, tracking_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">URL Rastreo</label>
                  <input value={form.tracking_url} onChange={e => setForm({...form, tracking_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" rows={2} />
              </div>
              <button onClick={saveOrder}
                disabled={!form.order_number || !form.supplier}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                {editing ? 'Guardar Cambios' : 'Crear Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
