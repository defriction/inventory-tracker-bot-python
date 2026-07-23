'use client';

import { useEffect, useState } from 'react';
import { AlertsResponse } from '@/types';
import { getAlerts } from '@/lib/api';

export default function AlertsPanel({ token }: { token: string }) {
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts(token)
      .then(setAlerts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-6">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-white/[0.05] rounded animate-pulse" />
          <div className="h-16 bg-white/[0.03] rounded-lg animate-pulse" />
          <div className="h-16 bg-white/[0.03] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const hasAlerts = (alerts?.low_stock?.length ?? 0) > 0 || (alerts?.expiring?.length ?? 0) > 0;

  if (!hasAlerts) {
    return (
      <div className="rounded-xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-sm font-semibold text-[#f7f8f8] tracking-[-0.13px]">
              Todo en orden
            </h3>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              Sin alertas de stock bajo ni vencimientos próximos
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-2">
        <span className="text-lg">🔔</span>
        <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-[-0.13px]">Alertas</h2>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {/* Low Stock */}
        {alerts?.low_stock && alerts.low_stock.length > 0 && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <h3 className="text-xs font-semibold text-[#d0d6e0] uppercase tracking-wider">
                Stock Bajo ({alerts.low_stock.length})
              </h3>
            </div>
            <div className="space-y-2">
              {alerts.low_stock.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/10 hover:bg-amber-500/[0.06] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#d0d6e0] truncate font-medium">{item.name}</p>
                    <p className="text-xs text-[#62666d] mt-0.5 font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                      {item.stock} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiring */}
        {alerts?.expiring && alerts.expiring.length > 0 && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <h3 className="text-xs font-semibold text-[#d0d6e0] uppercase tracking-wider">
                Por Vencer ({alerts.expiring.length})
              </h3>
            </div>
            <div className="space-y-2">
              {alerts.expiring
                .sort((a, b) => a.days_left - b.days_left)
                .map((item) => (
                  <div
                    key={item.sku}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                      item.days_left <= 0
                        ? 'bg-red-500/[0.08] border-red-500/20 hover:bg-red-500/[0.12]'
                        : item.days_left <= 7
                        ? 'bg-red-500/[0.04] border-red-500/10 hover:bg-red-500/[0.06]'
                        : 'bg-orange-500/[0.03] border-orange-500/10 hover:bg-orange-500/[0.05]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#d0d6e0] truncate font-medium">{item.name}</p>
                      <p className="text-xs text-[#62666d] mt-0.5 font-mono">
                        Vence: {item.expiration_date}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          item.days_left <= 0
                            ? 'text-red-400 bg-red-500/10'
                            : item.days_left <= 7
                            ? 'text-red-400 bg-red-500/10'
                            : 'text-orange-400 bg-orange-500/10'
                        }`}
                      >
                        {item.days_left <= 0
                          ? 'VENCIDO'
                          : item.days_left === 1
                          ? 'Mañana'
                          : `${item.days_left} días`}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
