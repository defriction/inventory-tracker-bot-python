'use client';

import { useEffect, useState } from 'react';
import { Stats } from '@/types';
import { getStats } from '@/lib/api';

export default function StatsCards({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      getStats(token)
        .then(setStats)
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const cards = [
    {
      label: 'Total Productos',
      value: stats?.total_products ?? '—',
      icon: '📦',
      color: 'from-indigo-50 to-indigo-100/50',
      border: 'border-indigo-200',
    },
    {
      label: 'Valor Inventario',
      value: stats ? `$${stats.total_stock_value.toLocaleString()}` : '—',
      icon: '💰',
      color: 'from-emerald-50 to-emerald-100/50',
      border: 'border-emerald-200',
    },
    {
      label: 'Stock Bajo',
      value: stats?.low_stock_count ?? '—',
      icon: '⚠️',
      color: stats && stats.low_stock_count > 0
        ? 'from-amber-50 to-amber-100/50'
        : 'from-gray-50 to-gray-100/50',
      border: stats && stats.low_stock_count > 0
        ? 'border-amber-300'
        : 'border-gray-200',
      pulse: stats && stats.low_stock_count > 0,
    },
    {
      label: 'Por Vencer',
      value: stats?.expiring_count ?? '—',
      icon: '📅',
      color: stats && stats.expiring_count > 0
        ? 'from-red-50 to-red-100/50'
        : 'from-gray-50 to-gray-100/50',
      border: stats && stats.expiring_count > 0
        ? 'border-red-300'
        : 'border-gray-200',
      pulse: stats && stats.expiring_count > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`
            relative overflow-hidden rounded-xl border ${card.border}
            bg-gradient-to-br ${card.color}
            backdrop-blur-xl bg-white/80
            p-5 transition-all duration-300
            hover:shadow-md hover:scale-[1.02]
          `}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 tracking-[-0.5px]">
                {loading ? (
                  <span className="inline-block w-16 h-8 bg-gray-100 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </span>
              {card.pulse && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
