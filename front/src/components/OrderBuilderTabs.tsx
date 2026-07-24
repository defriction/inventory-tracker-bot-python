'use client';

import { useState, useEffect } from 'react';
import { FileText, Truck, Users, X, Plus } from 'lucide-react';
import { Client, Product } from '@/types';
import { getInventory, getClients, createClient, updateClient, deleteClient, createRemision, getRemisiones } from '@/lib/api';
import { confirmToast } from '@/lib/confirm';
import toast from 'react-hot-toast';
import PurchaseOrderBuilder from './PurchaseOrderBuilder';

interface RemisionItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  current_stock: number;
}

export default function OrderBuilderTabs({ token, jwt }: { token: string; jwt?: string }) {
  const [activeTab, setActiveTab] = useState<'purchase' | 'remision'>('purchase');

  // Remision state
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<RemisionItem[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [remisiones, setRemisiones] = useState<any[]>([]);

  // Client form
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', contact: '', phone: '', email: '', address: '', notes: '' });
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    if (activeTab === 'remision') {
      getInventory(token, jwt).then(d => setProducts(d.products));
      getClients(token, jwt).then(d => setClients(d.clients)).catch(() => {});
      getRemisiones(token, jwt).then(d => setRemisiones(d.remisiones)).catch(() => {});
    }
  }, [activeTab, token, jwt]);

  const addItem = (product: Product) => {
    if (selected.find(s => s.sku === product.sku)) return;
    setSelected([...selected, {
      sku: product.sku, name: product.name,
      quantity: product.stock <= 0 ? 1 : Math.min(product.stock, 5),
      unit: product.unit, unit_price: product.price,
      current_stock: product.stock
    }]);
  };

  const removeItem = (sku: string) => setSelected(selected.filter(s => s.sku !== sku));
  const updateQty = (sku: string, qty: number) => {
    if (qty < 0) return;
    const item = selected.find(s => s.sku === sku);
    if (item && qty > item.current_stock) { toast.error('Stock insuficiente'); return; }
    setSelected(selected.map(s => s.sku === sku ? { ...s, quantity: qty } : s));
  };

  const updatePrice = (sku: string, price: number) => {
    if (price < 0) return;
    setSelected(selected.map(s => s.sku === sku ? { ...s, unit_price: price } : s));
  };

  const createRemisionOrder = async () => {
    if (!clientId || selected.length === 0) return;
    setSaving(true);
    try {
      await createRemision(token, {
        client_id: clientId,
        items: selected.map(s => ({ product_sku: s.sku, product_name: s.name, quantity: s.quantity, unit: s.unit, unit_price: s.unit_price })),
        notes
      }, jwt);
      toast.success('Remision creada — stock descontado');
      setSelected([]);
      setNotes('');
      getInventory(token, jwt).then(d => setProducts(d.products));
    } catch { toast.error('Error al crear remision'); }
    finally { setSaving(false); }
  };

  // Client CRUD
  const handleCreateClient = async () => {
    if (!clientForm.name) return;
    try {
      await createClient(token, clientForm, jwt);
      setClientForm({ name: '', contact: '', phone: '', email: '', address: '', notes: '' });
      getClients(token, jwt).then(d => setClients(d.clients));
      toast.success('Cliente creado');
    } catch { toast.error('Error'); }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    try {
      await updateClient(token, editingClient.id, clientForm, jwt);
      setEditingClient(null);
      setClientForm({ name: '', contact: '', phone: '', email: '', address: '', notes: '' });
      getClients(token, jwt).then(d => setClients(d.clients));
      toast.success('Cliente actualizado');
    } catch { toast.error('Error'); }
  };

  const handleDeleteClient = async (id: number, name: string) => {
    const ok = await confirmToast(`¿Eliminar "${name}"?`);
    if (!ok) return;
    try {
      await deleteClient(token, id, jwt);
      getClients(token, jwt).then(d => setClients(d.clients));
      toast.success(`${name} eliminado`);
    } catch { toast.error('Error'); }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-4">
        {[
          { key: 'purchase' as const, label: 'Orden de Compra', icon: <FileText className="w-4 h-4" /> },
          { key: 'remision' as const, label: 'Remisión', icon: <Truck className="w-4 h-4" /> },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Purchase Order Tab */}
      {activeTab === 'purchase' && (
        <PurchaseOrderBuilder token={token} jwt={jwt} />
      )}

      {/* Remision Tab */}
      {activeTab === 'remision' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Products */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" /> Productos
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">Click en un producto para agregarlo a la remision</p>
            </div>
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              {products.filter(p => p.stock > 0).map(p => (
                <button key={p.sku} onClick={() => addItem(p)}
                  className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.sku} | Stock: {p.stock}</p>
                  </div>
                  <span className="text-xs text-indigo-600 font-medium">+ Agregar</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Remision Builder */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Remision
              </h3>
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  <select value={selectedClient} onChange={e => {
                    setSelectedClient(e.target.value);
                    const cli = clients.find(c => c.name === e.target.value);
                    setClientId(cli ? cli.id : null);
                  }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 bg-white">
                    <option value="">Cliente *</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowClientForm(!showClientForm)}
                    className="px-2.5 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 text-sm">
                    <Users className="w-4 h-4" />
                  </button>
                </div>
                <input type="text" placeholder="Notas" value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              {/* Client Form */}
              {showClientForm && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600">Gestionar Clientes</h4>
                  {clients.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg text-sm">
                      <span className="text-gray-800">{c.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingClient(c); setClientForm({ name: c.name, contact: c.contact, phone: c.phone, email: c.email, address: c.address, notes: c.notes }); }}
                          className="text-xs text-indigo-600">Editar</button>
                        <button onClick={() => handleDeleteClient(c.id, c.name)} className="text-xs text-red-600">Eliminar</button>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1">
                    <input type="text" placeholder="Nombre *" value={clientForm.name}
                      onChange={e => setClientForm({...clientForm, name: e.target.value})}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input type="text" placeholder="Contacto" value={clientForm.contact}
                      onChange={e => setClientForm({...clientForm, contact: e.target.value})}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input type="text" placeholder="Telefono" value={clientForm.phone}
                      onChange={e => setClientForm({...clientForm, phone: e.target.value})}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <button onClick={editingClient ? handleUpdateClient : handleCreateClient} disabled={!clientForm.name}
                      className="w-full py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-500 disabled:opacity-40">
                      {editingClient ? 'Actualizar' : 'Crear Cliente'}
                    </button>
                    {editingClient && (
                      <button onClick={() => { setEditingClient(null); setClientForm({ name: '', contact: '', phone: '', email: '', address: '', notes: '' }); }}
                        className="w-full py-1 text-xs text-gray-500">Cancelar</button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="py-12 text-center">
                <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Selecciona productos de la izquierda</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto">
                {selected.map(item => (
                  <div key={item.sku} className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQty(item.sku, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-sm hover:bg-gray-200">−</button>
                      <span className="text-sm font-mono w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.sku, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-sm hover:bg-gray-200">+</button>
                      <span className="text-xs text-gray-400 ml-2">{item.unit} × $</span>
                      <input type="number" value={item.unit_price}
                        onChange={e => updatePrice(item.sku, parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:border-indigo-500" />
                      <span className="text-xs font-medium text-indigo-600 ml-auto">${item.quantity * item.unit_price}</span>
                      <button onClick={() => removeItem(item.sku)} className="ml-2 text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total remision</span>
                  <span className="font-bold text-gray-900">
                    ${selected.reduce((sum, s) => sum + s.quantity * s.unit_price, 0).toLocaleString()}
                  </span>
                </div>
                <button onClick={createRemisionOrder} disabled={!clientId || saving}
                  className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-500 disabled:opacity-40 transition-colors">
                  {saving ? 'Creando...' : 'Crear Remision (descuenta stock)'}
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Remision History */}
        {remisiones.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mt-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Historial de Remisiones</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">UID</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Cliente</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Items</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Total</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 hidden md:table-cell">Fecha</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {remisiones.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800">{r.uid}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{r.client_name}</td>
                      <td className="px-4 py-2 text-center text-xs text-gray-500">{r.item_count}</td>
                      <td className="px-4 py-2 text-right text-xs font-medium text-gray-800">${r.total_amount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs text-gray-400 hidden md:table-cell">{r.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-2 text-center">
                        <a href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/remisiones/${r.id}/pdf?token=${token}`}
                          className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                          target="_blank" rel="noopener">
                          📄 PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
      )}
    </div>
  );
}
