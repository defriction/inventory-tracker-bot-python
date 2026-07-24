'use client';

import { useState, useEffect } from 'react';
import { Building, FileText, Truck, History } from 'lucide-react';
import { getRemisiones } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Remision {
  id: number; uid: string; client_name: string;
  total_amount: number; item_count: number; created_at: string;
}

export default function MyBusiness({ token, jwt }: { token: string; jwt?: string }) {
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [pymeData, setPymeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load PyME info
    fetch(`${API_URL}/api/tenant-info?token=${token}`, {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
    }).then(r => r.json()).then(setPymeData).catch(() => {});

    // Load remisiones
    getRemisiones(token, jwt).then(d => setRemisiones(d.remisiones)).catch(() => {})
      .finally(() => setLoading(false));
  }, [token, jwt]);

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="h-20 bg-white rounded-xl"/>)}</div>;

  return (
    <div className="space-y-6">
      {/* PyME Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Building className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{pymeData?.pyme_name || pymeData?.token || 'Mi PyME'}</h2>
            <p className="text-xs text-gray-500">{pymeData?.business_type || 'Negocio'} · Token: {token}</p>
          </div>
        </div>
      </div>

      {/* Remision History */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-600" /> Historial de Remisiones
          </h3>
        </div>
        {remisiones.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            <History className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            No hay remisiones aún. Creá una en <strong>Armar Pedido</strong>.
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
                {remisiones.map(r => (
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
