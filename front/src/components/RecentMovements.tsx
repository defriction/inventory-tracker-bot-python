'use client';

import { useEffect, useState } from 'react';
import { Movement } from '@/types';
import { getMovements } from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
  VENTA: 'Venta',
  COMPRA: 'Compra',
  CREACION: 'Creación',
  AJUSTE: 'Ajuste',
};

const TYPE_COLORS: Record<string, string> = {
  VENTA: 'text-red-400 bg-red-500/10',
  COMPRA: 'text-emerald-400 bg-emerald-500/10',
  CREACION: 'text-indigo-400 bg-indigo-500/10',
  AJUSTE: 'text-amber-400 bg-amber-500/10',
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-[-0.13px]">
            Últimos Movimientos
          </h2>
        </div>
        <span className="text-xs text-[#62666d]">últimos 10</span>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <div className="p-12 text-center">
          <span className="text-3xl block mb-3">📭</span>
          <p className="text-sm text-[#8a8f98]">Sin movimientos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider">
                  Producto
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#62666d] uppercase tracking-wider hidden md:table-cell">
                  Usuario
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {movements.map((m) => (
                <tr
                  key={m.tx_id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3 text-sm text-[#d0d6e0] whitespace-nowrap font-mono text-xs">
                    {formatDate(m.timestamp)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        TYPE_COLORS[m.mov_type] || 'text-[#8a8f98] bg-white/[0.05]'
                      }`}
                    >
                      {TYPE_LABELS[m.mov_type] || m.mov_type}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-[#d0d6e0] truncate max-w-[200px]">
                      {m.name}
                    </p>
                    {m.notes && (
                      <p className="text-xs text-[#62666d] mt-0.5 truncate max-w-[200px]">
                        {m.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`text-sm font-mono font-medium ${
                        m.qty < 0
                          ? 'text-red-400'
                          : m.qty > 0
                          ? 'text-emerald-400'
                          : 'text-[#8a8f98]'
                      }`}
                    >
                      {m.qty > 0 ? '+' : ''}{m.qty}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#8a8f98] hidden md:table-cell whitespace-nowrap">
                    {m.user}
                  </td>
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
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}
