'use client';

import { useEffect, useState } from 'react';
import { AlertsResponse } from '@/types';
import { getAlerts } from '@/lib/api';

export default function AlertsPanel({ token }: { token: string }) {
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<'low_stock' | 'expiring' | null>(null);
  const [showAllLow, setShowAllLow] = useState(false);
  const [showAllExp, setShowAllExp] = useState(false);

  useEffect(() => {
    const fetchData = () => {
      getAlerts(token)
        .then(setAlerts)
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="space-y-3">
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
          <div className="h-14 bg-gray-50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const lowCount = alerts?.low_stock?.length ?? 0;
  const expiringCount = alerts?.expiring?.length ?? 0;
  const totalAlerts = lowCount + expiringCount;
  const hasAlerts = totalAlerts > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            hasAlerts ? 'bg-red-100' : 'bg-emerald-100'
          }`}>
            <span className="text-base">{hasAlerts ? '🔔' : '✅'}</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Notificaciones</h2>
            <p className="text-xs text-gray-400">
              {hasAlerts
                ? `${totalAlerts} alerta${totalAlerts !== 1 ? 's' : ''} activa${totalAlerts !== 1 ? 's' : ''}`
                : 'Sin alertas — todo en orden'}
            </p>
          </div>
        </div>
        {hasAlerts && (
          <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full min-w-[22px] text-center">
            {totalAlerts}
          </span>
        )}
      </div>

      {!hasAlerts ? (
        <div className="p-8 text-center">
          <span className="text-3xl block mb-2">🎉</span>
          <p className="text-sm text-gray-500">Sin notificaciones pendientes</p>
          <p className="text-xs text-gray-400 mt-1">Te avisamos si algo necesita atencion</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {/* Low Stock Notification */}
          {lowCount > 0 && (
            <div>
              <button
                onClick={() => setExpanded(expanded === 'low_stock' ? null : 'low_stock')}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Stock Bajo</span>
                    <span className="text-xs text-gray-400 ml-2">{lowCount} producto{lowCount !== 1 && 's'}</span>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === 'low_stock' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded === 'low_stock' && (
                <div className="px-5 pb-3 space-y-1.5">
                  {(showAllLow ? alerts!.low_stock : alerts!.low_stock.slice(0, 3)).map(item => (
                    <div key={item.sku} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-50/70 border border-amber-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-800 font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {item.sku}</p>
                      </div>
                      <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full shrink-0">
                        {item.stock} {item.unit}
                      </span>
                    </div>
                  ))}
                  {alerts!.low_stock.length > 3 && (
                    <button
                      onClick={() => setShowAllLow(!showAllLow)}
                      className="w-full text-xs text-indigo-600 hover:text-indigo-500 font-medium py-1.5"
                    >
                      {showAllLow ? 'Mostrar menos' : `Ver los ${alerts!.low_stock.length - 3} restantes`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Expiring Notification */}
          {expiringCount > 0 && (
            <div>
              <button
                onClick={() => setExpanded(expanded === 'expiring' ? null : 'expiring')}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Por Vencer</span>
                    <span className="text-xs text-gray-400 ml-2">{expiringCount} producto{expiringCount !== 1 && 's'}</span>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === 'expiring' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded === 'expiring' && (
                <div className="px-5 pb-3 space-y-1.5">
                  {(showAllExp ? alerts!.expiring.sort((a,b) => a.days_left - b.days_left) : alerts!.expiring.sort((a,b) => a.days_left - b.days_left).slice(0, 3)).map(item => (
                    <div key={item.sku} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${
                      item.days_left <= 0 ? 'bg-red-50 border-red-200' :
                      item.days_left <= 7 ? 'bg-red-50/50 border-red-100' :
                      'bg-orange-50 border-orange-100'
                    }`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-800 font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.expiration_date}</p>
                      </div>
                      <span className={`ml-2 text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                        item.days_left <= 0 ? 'text-red-700 bg-red-100' :
                        item.days_left <= 7 ? 'text-red-600 bg-red-100' :
                        'text-orange-700 bg-orange-100'
                      }`}>
                        {item.days_left <= 0 ? 'Vencido' : item.days_left === 1 ? 'Mañana' : `${item.days_left} d`}
                      </span>
                    </div>
                  ))}
                  {alerts!.expiring.length > 3 && (
                    <button
                      onClick={() => setShowAllExp(!showAllExp)}
                      className="w-full text-xs text-indigo-600 hover:text-indigo-500 font-medium py-1.5"
                    >
                      {showAllExp ? 'Mostrar menos' : `Ver los ${alerts!.expiring.length - 3} restantes`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
