'use client';

import { useEffect, useState } from 'react';
import { Package, DollarSign, AlertTriangle, CalendarClock } from 'lucide-react';
import { Stats } from '@/types';
import { getStats } from '@/lib/api';

export default function StatsCards({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => { getStats(token).then(setStats).catch(() => {}).finally(() => setLoading(false)); };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const cards = [
    { label: 'Total Productos', value: stats?.total_products ?? '—', icon: Package, color: 'indigo' },
    { label: 'Valor Inventario', value: stats ? `$${stats.total_stock_value.toLocaleString()}` : '—', icon: DollarSign, color: 'emerald' },
    { label: 'Stock Bajo', value: stats?.low_stock_count ?? '—', icon: AlertTriangle, color: stats && stats.low_stock_count > 0 ? 'amber' : 'gray' },
    { label: 'Por Vencer', value: stats?.expiring_count ?? '—', icon: CalendarClock, color: stats && stats.expiring_count > 0 ? 'red' : 'gray' },
  ];

  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-700' },
    gray: { bg: 'bg-gray-50', icon: 'text-gray-400', text: 'text-gray-500' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const c = colorMap[card.color];
        return (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${c.icon}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {loading ? <span className="inline-block w-16 h-7 bg-gray-100 rounded animate-pulse" /> : card.value}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
