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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const hasAlerts = (alerts?.low_stock?.length ?? 0) > 0 || (alerts?.expiring?.length ?? 0) > 0;

  if (!hasAlerts) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Todo en orden</h3>
            <p className="text-xs text-gray-500 mt-0.5">Sin alertas de stock bajo ni vencimientos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">🔔</span>
        <h2 className="text-sm font-semibold text-gray-900">Alertas</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {alerts?.low_stock && alerts.low_stock.length > 0 && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Stock Bajo ({alerts.low_stock.length})
              </h3>
            </div>
            <div className="space-y-2">
              {alerts.low_stock.map((item) => (
                <div key={item.sku} className="flex items-center justify-between px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 truncate font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="ml-4">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                      {item.stock} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts?.expiring && alerts.expiring.length > 0 && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Por Vencer ({alerts.expiring.length})
              </h3>
            </div>
            <div className="space-y-2">
              {alerts.expiring
                .sort((a, b) => a.days_left - b.days_left)
                .map((item) => (
                  <div
                    key={item.sku}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                      item.days_left <= 0
                        ? 'bg-red-50 border-red-200'
                        : item.days_left <= 7
                        ? 'bg-red-50/50 border-red-100'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate font-medium">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">Vence: {item.expiration_date}</p>
                    </div>
                    <div className="ml-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        item.days_left <= 0
                          ? 'text-red-700 bg-red-100'
                          : item.days_left <= 7
                          ? 'text-red-600 bg-red-100'
                          : 'text-orange-700 bg-orange-100'
                      }`}>
                        {item.days_left <= 0 ? 'VENCIDO' : item.days_left === 1 ? 'Mañana' : `${item.days_left} dias`}
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
