'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Copy, Check, Users, Store, Hash, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Tenant {
  tenant_id: string;
  pyme_name: string;
  token: string;
  telegram_id: string;
  business_type: string;
  created_at: string;
}

export default function AdminPanel({ jwt }: { jwt?: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({ nombre_negocio: '', tipo_negocio: '', admin_telegram_id: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');

  const headers = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (jwt) h['Authorization'] = `Bearer ${jwt}`;
    return h;
  };

  const fetchTenants = () => {
    fetch(`${API_URL}/admin/tenants`, { headers: headers() })
      .then(r => r.json())
      .then(d => setTenants(d.tenants || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const createTenant = async () => {
    if (!form.nombre_negocio || !form.tipo_negocio) return;
    setCreating(true); setError('');
    try {
      const res = await fetch(`${API_URL}/admin/create-pyme`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail || 'Error'); return; }
      setForm({ nombre_negocio: '', tipo_negocio: '', admin_telegram_id: '' });
      setShowForm(false);
      fetchTenants();
    } catch { setError('Error de conexion'); }
    finally { setCreating(false); }
  };

  const deleteTenant = async (id: string, name: string) => {
    if (!confirm(`Eliminar "${name}" y todos sus datos? Esta accion no se puede deshacer.`)) return;
    setDeleting(id);
    await fetch(`${API_URL}/admin/tenants/${id}`, { method: 'DELETE', headers: headers() });
    setDeleting('');
    fetchTenants();
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Administracion de PyMEs</h2>
          <p className="text-sm text-gray-500">{tenants.length} negocio{tenants.length !== 1 ? 's' : ''} registrado{tenants.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nueva PyME
        </button>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tenants.map(t => (
          <div key={t.tenant_id} className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{t.pyme_name}</h3>
                  <p className="text-xs text-gray-400">{t.business_type || 'Sin tipo'}</p>
                </div>
              </div>
              <button onClick={() => deleteTenant(t.tenant_id, t.pyme_name)} disabled={deleting === t.tenant_id}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                {deleting === t.tenant_id ? (
                  <span className="w-4 h-4 block animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                ) : <Trash2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2">
              {/* Token */}
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded flex-1 truncate">{t.token}</code>
                <button onClick={() => copyToken(t.token)}
                  className="p-1 text-gray-400 hover:text-indigo-600 rounded shrink-0">
                  {copied === t.token ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Telegram */}
              {t.telegram_id && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Telegram: {t.telegram_id}</span>
                </div>
              )}

              {/* Created */}
              {t.created_at && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span>Creado: {t.created_at.slice(0, 16)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay PyMEs registradas</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-indigo-600 font-medium">
            Crear primera PyME
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Nueva PyME</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del Negocio *</label>
                <input value={form.nombre_negocio} onChange={e => setForm({ ...form, nombre_negocio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Tienda Doña Julia" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Negocio *</label>
                <input value={form.tipo_negocio} onChange={e => setForm({ ...form, tipo_negocio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Tienda, Restaurante, Farmacia..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telegram ID (opcional)</label>
                <input value={form.admin_telegram_id} onChange={e => setForm({ ...form, admin_telegram_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="123456789" />
              </div>
              <button onClick={createTenant}
                disabled={!form.nombre_negocio || !form.tipo_negocio || creating}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                {creating ? 'Creando...' : 'Crear PyME'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
