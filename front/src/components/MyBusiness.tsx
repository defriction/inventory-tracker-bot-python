'use client';

import { useState, useEffect } from 'react';
import { Building, Truck, History, Package, Users, TrendingUp, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { getRemisiones } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Remision {
  id: number; uid: string; client_name: string;
  total_amount: number; item_count: number; created_at: string;
}

export default function MyBusiness({ token, jwt }: { token: string; jwt?: string }) {
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [pymeData, setPymeData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers: Record<string, string> = jwt ? { Authorization: `Bearer ${jwt}` } : {};

  useEffect(() => {
    const q = jwt ? '' : `?token=${token}`;

    Promise.all([
      fetch(`${API_URL}/api/tenant-info${q}`, { headers }).then(r => r.json()),
      getRemisiones(token, jwt),
      fetch(`${API_URL}/api/stats${q}`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/movements${q}&limit=5`, { headers }).then(r => r.json()).catch(() => ({ movements: [] })),
      fetch(`${API_URL}/api/inventory${q}`, { headers }).then(r => r.json()).catch(() => ({ products: [] })),
    ]).then(([pyme, rem, s, mov, inv]) => {
      setPymeData(pyme);
      setRemisiones(rem.remisiones || []);
      setStats(s);
      setMovements(mov.movements || []);
      setLowStock((inv.products || []).filter((p: any) => p.stock <= 5 && p.stock > 0).slice(0, 4));
    }).finally(() => setLoading(false));
  }, [token, jwt]);

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-white rounded-xl"/>)}</div>;

  const totalProducts = stats?.total_products || 0;
  const totalValue = stats?.total_value || 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-50 to-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shadow-sm">
            <Building className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{pymeData?.pyme_name || token}</h2>
            <p className="text-sm text-gray-500">{pymeData?.business_type || 'PyME'} · Activo desde {pymeData?.created_at?.slice(0, 10) || 'hoy'}</p>
            {pymeData?.nit && <p className="text-xs text-gray-400 mt-0.5">NIT: {pymeData.nit}</p>}
            {pymeData?.address && <p className="text-xs text-gray-400">📍 {pymeData.address}</p>}
            {pymeData?.description && <p className="text-xs text-gray-400 mt-1 italic">"{pymeData.description}"</p>}
          </div>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">Token: {token.slice(0, 6)}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Package className="w-5 h-5" />, label: 'Productos', value: totalProducts, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { icon: <Truck className="w-5 h-5" />, label: 'Remisiones', value: remisiones.length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { icon: <TrendingUp className="w-5 h-5" />, label: 'Valor Total', value: `$${totalValue.toLocaleString()}`, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { icon: <Users className="w-5 h-5" />, label: 'Clientes', value: stats?.total_clients || 0, color: 'bg-violet-50 text-violet-700 border-violet-200' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl border ${kpi.color} p-4`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs opacity-70">{kpi.label}</span>
              {kpi.icon}
            </div>
            <p className="text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Low Stock + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Stock Bajo
            </h3>
            <span className="text-xs text-gray-400">{lowStock.length} productos</span>
          </div>
          {lowStock.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">¡Todo en orden! Sin alertas de stock bajo.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {lowStock.map((p: any) => (
                <div key={p.sku} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">{p.stock} {p.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" /> Actividad Reciente
            </h3>
          </div>
          {movements.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Sin actividad reciente.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {movements.map((m: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${m.type === 'VENTA' || m.type === 'REMISION' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.type} · {m.created_at?.slice(0, 16)}</p>
                  </div>
                  <span className={`text-sm font-medium ${m.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Remision History */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-600" /> Historial de Remisiones
          </h3>
          <span className="text-xs text-gray-400">{remisiones.length} remisiones</span>
        </div>
        {remisiones.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            No hay remisiones aún. Creá una en <strong>Pedido</strong>.
          </div>
        ) : (
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
                {remisiones.slice(0, 10).map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800">{r.uid}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{r.client_name}</td>
                    <td className="px-4 py-2 text-center text-xs text-gray-500">{r.item_count}</td>
                    <td className="px-4 py-2 text-right text-xs font-medium text-gray-800">${r.total_amount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-gray-400 hidden md:table-cell">{r.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-2 text-center">
                      <a href={`${API_URL}/api/remisiones/${r.id}/pdf?token=${token}`}
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
        )}
      </div>
    </div>
  );
}
