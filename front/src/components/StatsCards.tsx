'use client';

import { useEffect, useState } from 'react';
import { Stats } from '@/types';
import { getStats } from '@/lib/api';

export default function StatsCards({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats(token)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const cards = [
    {
      label: 'Total Productos',
      value: stats?.total_products ?? '—',
      icon: '📦',
      color: 'from-indigo-500/20 to-indigo-600/10',
      border: 'border-indigo-500/20',
    },
    {
      label: 'Valor Inventario',
      value: stats ? `$${stats.total_stock_value.toLocaleString()}` : '—',
      icon: '💰',
      color: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Stock Bajo',
      value: stats?.low_stock_count ?? '—',
      icon: '⚠️',
      color: stats && stats.low_stock_count > 0
        ? 'from-amber-500/20 to-amber-600/10'
        : 'from-gray-500/10 to-gray-600/5',
      border: stats && stats.low_stock_count > 0
        ? 'border-amber-500/30'
        : 'border-white/5',
      pulse: stats && stats.low_stock_count > 0,
    },
    {
      label: 'Por Vencer',
      value: stats?.expiring_count ?? '—',
      icon: '📅',
      color: stats && stats.expiring_count > 0
        ? 'from-red-500/20 to-red-600/10'
        : 'from-gray-500/10 to-gray-600/5',
      border: stats && stats.expiring_count > 0
        ? 'border-red-500/30'
        : 'border-white/5',
      pulse: stats && stats.expiring_count > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`
            relative overflow-hidden rounded-xl border ${card.border}
            bg-gradient-to-br ${card.color}
            backdrop-blur-xl bg-white/[0.02]
            p-5 transition-all duration-300
            hover:bg-white/[0.04] hover:scale-[1.02]
          `}
        >
          {/* Glass highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#8a8f98] tracking-[-0.13px]">
                {card.label}
              </span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-[#f7f8f8] tracking-[-0.5px]">
                {loading ? (
                  <span className="inline-block w-16 h-8 bg-white/[0.05] rounded animate-pulse" />
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
