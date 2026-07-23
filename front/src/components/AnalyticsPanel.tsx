'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { AnalyticsResponse } from '@/types';
import { getAnalytics } from '@/lib/api';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const ABC_COLORS: Record<string, string> = { A: '#4f46e5', B: '#06b6d4', C: '#94a3b8' };

export default function AnalyticsPanel({ token }: { token: string }) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = () => {
      getAnalytics(token)
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-600">{error || 'Sin datos disponibles'}</p>
      </div>
    );
  }

  const abcCount = { A: 0, B: 0, C: 0 };
  data.abc_classification.forEach(i => { abcCount[i.class as keyof typeof abcCount]++; });

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue 90d" value={`$${data.total_revenue_90d.toLocaleString()}`} icon="💰" color="indigo" />
        <KpiCard label="Unidades Vendidas" value={data.total_units_sold_90d.toString()} icon="📦" color="emerald" />
        <KpiCard label="Productos Clase A" value={abcCount.A.toString()} icon="⭐" color="amber" />
        <KpiCard label="Sin Stock" value={data.stock_health.out_of_stock.toString()} icon="🔴" color={data.stock_health.out_of_stock > 0 ? 'red' : 'gray'} />
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <span>💡</span> Recomendaciones para tu negocio
          </h3>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <p key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">{rec.slice(0, 2)}</span>
                <span>{rec.slice(3)}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Sales Trend */}
      <ChartCard title="Tendencia de Ventas (30 dias)" icon="📈">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.sales_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
            <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <ChartCard title="Revenue por Categoria" icon="📊">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.category_breakdown} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ category, pct }: any) => `${category} ${(pct * 100).toFixed(0)}%`}>
                {data.category_breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Sellers */}
        <ChartCard title="Top 10 Productos" icon="🏆">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.top_sellers.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={95} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ABC Summary */}
      <ChartCard title="Clasificacion ABC (Pareto)" icon="📐">
        <div className="flex items-center gap-6 mb-4">
          <AbcBadge label="Clase A" count={abcCount.A} desc="70% revenue" color="indigo" />
          <AbcBadge label="Clase B" count={abcCount.B} desc="20% revenue" color="cyan" />
          <AbcBadge label="Clase C" count={abcCount.C} desc="10% revenue" color="gray" />
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left py-2">Producto</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">%</th>
                <th className="text-center py-2 w-16">Clase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.abc_classification.slice(0, 20).map(item => (
                <tr key={item.sku} className="hover:bg-gray-50">
                  <td className="py-1.5 text-gray-700 truncate max-w-[150px]">{item.name}</td>
                  <td className="py-1.5 text-right text-gray-600 font-mono">${item.revenue.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-gray-500">{item.pct}%</td>
                  <td className="py-1.5 text-center">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.class === 'A' ? 'bg-indigo-100 text-indigo-700' :
                      item.class === 'B' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{item.class}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const borders: Record<string, string> = {
    indigo: 'border-indigo-200', emerald: 'border-emerald-200', amber: 'border-amber-200',
    red: 'border-red-200', gray: 'border-gray-200',
  };
  return (
    <div className={`rounded-xl border ${borders[color] || 'border-gray-200'} bg-white shadow-sm p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function AbcBadge({ label, count, desc, color }: { label: string; count: number; desc: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  };
  return (
    <div className={`flex-1 rounded-lg border ${colors[color]} p-3 text-center`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs font-semibold mt-0.5">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
    </div>
  );
}
