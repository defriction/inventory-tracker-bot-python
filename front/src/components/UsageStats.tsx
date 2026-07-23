'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Activity, MousePointerClick, Eye, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface UsageStats {
  total_events: number;
  by_event: Record<string, number>;
  by_category: Record<string, number>;
  by_tab: Record<string, number>;
  daily: { date: string; count: number }[];
  recent: { event: string; category: string; tab: string; created_at: string }[];
}

export default function UsageStats({ token }: { token: string }) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchStats = () => {
    const endpoint = token === '3HF784F' ? `${API_URL}/api/usage/admin-stats?days=${days}` : `${API_URL}/api/usage/stats?token=${token}&days=${days}`;
    fetch(endpoint)
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [token, days]);

  if (loading || !stats) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-white rounded-xl"/>)}</div>;

  const tabData = Object.entries(stats.by_tab).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  const eventData = Object.entries(stats.by_event).slice(0, 10).map(([name, count]) => ({ name: name.replace('_', ' '), count }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics de Uso</h2>
          <p className="text-sm text-gray-500">Como interactuan los usuarios con la aplicacion</p>
        </div>
        <select value={days} onChange={e => setDays(parseInt(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={60}>60 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Activity className="w-5 h-5" />} label="Eventos Totales" value={stats.total_events} color="indigo" />
        <Kpi icon={<MousePointerClick className="w-5 h-5" />} label="Tipos de Evento" value={Object.keys(stats.by_event).length} color="emerald" />
        <Kpi icon={<Eye className="w-5 h-5" />} label="Pestañas Visitadas" value={Object.keys(stats.by_tab).length} color="amber" />
        <Kpi icon={<TrendingUp className="w-5 h-5" />} label="Promedio Diario" value={stats.total_events > 0 ? Math.round(stats.total_events / days) : 0} color="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Actividad Diaria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabs Usage */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Pestañas mas Visitadas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tabData} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={85} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event Types */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Tipos de Eventos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {eventData.map(e => (
            <div key={e.name} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <div className="text-xl font-bold text-indigo-600">{e.count}</div>
              <div className="text-[10px] text-gray-500 mt-1 capitalize">{e.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Eventos Recientes</h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {stats.recent && stats.recent.length > 0 ? (
            stats.recent.map((e, i) => (
            <div key={i} className="px-6 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700 capitalize">{e.event.replace('_', ' ')}</span>
                {e.tab && <span className="text-gray-400">en {e.tab}</span>}
              </div>
              <span className="text-gray-400 font-mono">{e.created_at?.slice(11, 16)}</span>
            </div>
          ))) : (
            <div className="px-6 py-8 text-center text-xs text-gray-400">Sin eventos recientes</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const borders: Record<string, string> = { indigo: 'border-indigo-200', emerald: 'border-emerald-200', amber: 'border-amber-200', cyan: 'border-cyan-200' };
  return (
    <div className={`rounded-xl border ${borders[color]} bg-white shadow-sm p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={color === 'indigo' ? 'text-indigo-500' : color === 'emerald' ? 'text-emerald-500' : color === 'amber' ? 'text-amber-500' : 'text-cyan-500'}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
