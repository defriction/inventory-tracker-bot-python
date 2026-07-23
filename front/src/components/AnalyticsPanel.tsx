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

      {/* Advanced: Demand Forecasts */}
      {data.advanced?.demand_forecasts?.length > 0 && (
        <ChartCard title="Prediccion de Demanda (7 dias)" icon="🔮">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.advanced.demand_forecasts.slice(0, 6).map(f => (
              <div key={f.sku} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{f.sku}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-indigo-600">{f.forecast_7d}</span>
                  <span className="text-xs text-gray-400">unid/7d</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${f.trend === 'up' ? 'text-emerald-600' : f.trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
                    {f.trend === 'up' ? '↑' : f.trend === 'down' ? '↓' : '→'} {f.trend}
                  </span>
                  <span className="text-[10px] text-gray-400">{f.method}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Advanced: ABC-XYZ */}
      {data.advanced?.abc_xyz?.length > 0 && (
        <ChartCard title="Clasificacion ABC-XYZ" icon="🎯">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {['AX','AY','AZ','BX','BY','BZ','CX','CY','CZ'].map(cls => {
              const count = data.advanced!.abc_xyz.filter(i => i.classification === cls).length;
              return (
                <div key={cls} className={`rounded-lg border p-2 text-center ${
                  cls.startsWith('A') ? 'border-indigo-200 bg-indigo-50' :
                  cls.startsWith('B') ? 'border-cyan-200 bg-cyan-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="text-lg font-bold text-gray-800">{count}</div>
                  <div className="text-[10px] font-semibold text-gray-500">{cls}</div>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left py-1">SKU</th><th className="text-right py-1">Revenue</th><th className="text-center py-1">ABC</th><th className="text-center py-1">CV</th><th className="text-center py-1">Clase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.abc_xyz.slice(0, 15).map(item => (
                  <tr key={item.sku}>
                    <td className="py-1 text-gray-700">{item.sku}</td>
                    <td className="py-1 text-right text-gray-600">${item.total_revenue.toLocaleString()}</td>
                    <td className="py-1 text-center"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.abc === 'A' ? 'bg-indigo-100 text-indigo-700' : item.abc === 'B' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>{item.abc}</span></td>
                    <td className="py-1 text-center text-gray-500">{item.cv.toFixed(2)}</td>
                    <td className="py-1 text-center font-mono text-[10px] font-bold">{item.classification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Advanced: Reorder Recommendations */}
      {data.advanced?.reorder_recommendations?.length > 0 && (
        <ChartCard title="Punto de Reorden (lead time 3d, 95%)" icon="📋">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left py-2">Producto</th><th className="text-right py-2">Stock</th><th className="text-right py-2">Demanda/d</th><th className="text-right py-2">ROP</th><th className="text-right py-2">Dias</th><th className="text-right py-2">Pedir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.reorder_recommendations.map(r => (
                  <tr key={r.sku} className="hover:bg-gray-50">
                    <td className="py-1.5 text-gray-700 truncate max-w-[120px]">{r.name}</td>
                    <td className="py-1.5 text-right text-gray-600">{r.current_stock}</td>
                    <td className="py-1.5 text-right text-gray-500">{r.daily_demand}</td>
                    <td className="py-1.5 text-right font-mono text-gray-800">{r.reorder_point}</td>
                    <td className="py-1.5 text-right">
                      <span className={`font-medium ${r.days_until_reorder <= 0 ? 'text-red-600' : r.days_until_reorder <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {r.days_until_reorder <= 0 ? 'YA' : r.days_until_reorder}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-semibold text-indigo-600">{r.recommended_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Advanced: Anomalies */}
      {data.advanced?.anomalies?.length > 0 && (
        <ChartCard title="Anomalias de Venta (z-score)" icon="⚠️">
          <div className="space-y-2">
            {data.advanced.anomalies.slice(-6).reverse().map((a, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-2 rounded-lg border ${
                a.type === 'spike' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`}>
                <div>
                  <span className="text-sm font-medium text-gray-800">{a.date}</span>
                  <span className="text-xs text-gray-500 ml-2">Esperado: ${a.expected.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${a.type === 'spike' ? 'text-emerald-700' : 'text-red-700'}`}>
                    ${a.revenue.toLocaleString()}
                  </span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    a.type === 'spike' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    z={a.z_score} {a.type === 'spike' ? '↑' : '↓'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Advanced: Correlations */}
      {data.advanced?.correlations?.length > 0 && (
        <ChartCard title="Productos que se Venden Juntos" icon="🔗">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.advanced.correlations.slice(0, 6).map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50/50">
                <div className={`w-2 h-2 rounded-full ${c.strength === 'strong' ? 'bg-indigo-500' : 'bg-cyan-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{c.product_a}</p>
                  <p className="text-sm text-gray-800 truncate">{c.product_b}</p>
                </div>
                <span className="text-xs font-bold text-indigo-600">{(c.correlation * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Advanced: Seasonality */}
      {data.advanced?.seasonality?.has_seasonality && (
        <ChartCard title={`Estacionalidad (pico: ${data.advanced.seasonality.peak_month}, valle: ${data.advanced.seasonality.low_month})`} icon="📅">
          <div className="flex items-end gap-1 h-32">
            {Object.entries(data.advanced.seasonality.monthly_index).map(([month, val]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400">{month}</span>
                <div
                  className={`w-full rounded-t ${val >= 1 ? 'bg-indigo-500' : 'bg-gray-300'}`}
                  style={{ height: `${val * 50}px`, opacity: Math.max(0.3, val / 1.5) }}
                />
                <span className="text-[10px] font-medium text-gray-600">{val.toFixed(1)}x</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Advanced: Turnover */}
      {data.advanced?.turnover?.length > 0 && (
        <ChartCard title="Rotacion de Inventario" icon="🔄">
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left py-2">Producto</th><th className="text-right py-2">Vendido</th><th className="text-right py-2">Stock</th><th className="text-right py-2">Rotacion</th><th className="text-right py-2">Dias/venta</th><th className="text-center py-2">Eficiencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.turnover.slice(0, 15).map(t => (
                  <tr key={t.sku}>
                    <td className="py-1.5 text-gray-700 truncate max-w-[120px]">{t.name}</td>
                    <td className="py-1.5 text-right text-gray-600">{t.units_sold}</td>
                    <td className="py-1.5 text-right text-gray-500">{t.current_stock}</td>
                    <td className="py-1.5 text-right font-mono text-gray-800">{t.turnover_ratio}x</td>
                    <td className="py-1.5 text-right text-gray-500">{t.days_to_sell}d</td>
                    <td className="py-1.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.efficiency === 'high' ? 'bg-emerald-100 text-emerald-700' :
                        t.efficiency === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{t.efficiency}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

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
