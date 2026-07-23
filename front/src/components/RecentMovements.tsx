'use client';

import { useEffect, useState } from 'react';
import { Movement } from '@/types';
import { getMovements } from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
  VENTA: 'Venta',
  COMPRA: 'Compra',
  CREACION: 'Creacion',
  AJUSTE: 'Ajuste',
};

const TYPE_COLORS: Record<string, string> = {
  VENTA: 'text-red-700 bg-red-100',
  COMPRA: 'text-emerald-700 bg-emerald-100',
  CREACION: 'text-indigo-700 bg-indigo-100',
  AJUSTE: 'text-amber-700 bg-amber-100',
};

export default function RecentMovements({ token }: { token: string }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMovements(token, 10)
      .then((data) => setMovements(data.movements))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="text-sm font-semibold text-gray-900">Ultimos Movimientos</h2>
        </div>
        <span className="text-xs text-gray-400">ultimos 10</span>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <div className="p-12 text-center">
          <span className="text-3xl block mb-3">📭</span>
          <p className="text-sm text-gray-400">Sin movimientos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Producto</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cantidad</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movements.map((m) => (
                <tr key={m.tx_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap font-mono text-xs">
                    {formatDate(m.timestamp)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[m.mov_type] || 'text-gray-600 bg-gray-100'}`}>
                      {TYPE_LABELS[m.mov_type] || m.mov_type}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-gray-900 truncate max-w-[200px]">{m.name}</p>
                    {m.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{m.notes}</p>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`text-sm font-mono font-semibold ${
                      m.qty < 0 ? 'text-red-600' : m.qty > 0 ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {m.qty > 0 ? '+' : ''}{m.qty}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell whitespace-nowrap">{m.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}
