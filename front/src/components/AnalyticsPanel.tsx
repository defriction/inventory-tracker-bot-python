'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { AnalyticsResponse } from '@/types';
import { getAnalytics } from '@/lib/api';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

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
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
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
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ingresos 90d" value={`$${data.total_revenue_90d.toLocaleString()}`} icon="💰" color="indigo" />
        <KpiCard label="Unidades Vendidas" value={data.total_units_sold_90d.toString()} icon="📦" color="emerald" />
        <KpiCard label="Productos Clase A" value={abcCount.A.toString()} icon="⭐" color="amber" />
        <KpiCard label="Sin Stock" value={data.stock_health.out_of_stock.toString()} icon="🔴" color={data.stock_health.out_of_stock > 0 ? 'red' : 'gray'} />
      </div>

      {/* Recomendaciones */}
      {data.recommendations.length > 0 && (
        <SectionCard title="Recomendaciones para tu Negocio" icon="💡" description="Alertas accionables basadas en los datos reales de tu inventario. Cada recomendacion busca maximizar tus ganancias y reducir perdidas.">
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-lg shrink-0 mt-0.5">{rec.slice(0, 2)}</span>
                <p className="text-sm text-amber-800">{rec.slice(3)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Tendencia de ventas */}
      <SectionCard title="Tendencia de Ventas" icon="📈" description="Visualiza como han evolucionado tus ingresos dia a dia. Identifica patrones, dias fuertes y debiles para planificar compras y promociones.">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.sales_trend}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={50} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
              formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Ingresos']}
              labelFormatter={(l) => `Fecha: ${l}`} />
            <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue por categoria */}
        <SectionCard title="Ingresos por Categoria" icon="📊" description="Descubre que categorias generan mas dinero. Util para decidir donde enfocar tus esfuerzos de compra y marketing.">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.category_breakdown} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={55}
                label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                {data.category_breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Ingresos']} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Top sellers */}
        <SectionCard title="Productos mas Vendidos" icon="🏆" description="Tus productos estrella por ingresos generados. Protege el stock de estos productos: son los que mas aportan a tu negocio.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.top_sellers.slice(0, 8)} layout="vertical" margin={{ left: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={105} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Ingresos']} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {data.top_sellers.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ABC */}
      <SectionCard title="Clasificacion ABC (Pareto)" icon="📐" description="El principio de Pareto aplicado a tu inventario. Clase A = 70% de tus ingresos (proteger stock). Clase B = 20%. Clase C = 10% (revisar si vale la pena mantenerlos).">
        <div className="flex gap-4 mb-6">
          <AbcBadge label="Clase A" count={abcCount.A} desc="70% ingresos" color="indigo" />
          <AbcBadge label="Clase B" count={abcCount.B} desc="20% ingresos" color="cyan" />
          <AbcBadge label="Clase C" count={abcCount.C} desc="10% ingresos" color="gray" />
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs">
                <th className="text-left py-2 font-medium">Producto</th>
                <th className="text-right py-2 font-medium">Ingresos</th>
                <th className="text-right py-2 font-medium">%</th>
                <th className="text-center py-2 font-medium w-16">Clase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.abc_classification.slice(0, 20).map(item => (
                <tr key={item.sku} className="hover:bg-gray-50">
                  <td className="py-2 text-gray-700 truncate max-w-[180px]">{item.name}</td>
                  <td className="py-2 text-right text-gray-600 font-mono text-xs">${item.revenue.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-500 text-xs">{item.pct}%</td>
                  <td className="py-2 text-center">
                    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
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
      </SectionCard>

      {/* Prediccion de demanda */}
      {data.advanced?.demand_forecasts?.length > 0 && (
        <SectionCard title="Prediccion de Demanda" icon="🔮" description="Pronostico de ventas para los proximos 7 dias usando suavizacion exponencial. Te ayuda a saber cuanto stock necesitas para no quedarte corto ni tener exceso.">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.advanced.demand_forecasts.slice(0, 6).map(f => (
              <div key={f.sku} className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 p-4 hover:shadow-md transition-shadow">
                <p className="text-xs text-gray-400 font-mono mb-2">{f.sku}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-indigo-600">{f.forecast_7d}</span>
                  <span className="text-sm text-gray-400">unid / 7 dias</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    f.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                    f.trend === 'down' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {f.trend === 'up' ? '↑ Al alza' : f.trend === 'down' ? '↓ A la baja' : '→ Estable'}
                  </span>
                  <span className="text-[10px] text-gray-400">{f.method === 'exponential_smoothing' ? 'Suavizacion exp.' : 'Promedio'}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
                  <span>Promedio: {f.daily_avg}/dia</span>
                  <span>Confianza: {(f.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ABC-XYZ */}
      {data.advanced?.abc_xyz?.length > 0 && (
        <SectionCard title="Clasificacion ABC-XYZ" icon="🎯" description="Combina valor (ABC) con estabilidad de demanda (XYZ). AX = producto valioso y estable. CZ = poco valor y erratico. Optimiza tu estrategia de compra por cuadrante.">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['AX','AY','AZ','BX','BY','BZ','CX','CY','CZ'].map(cls => {
              const count = data.advanced!.abc_xyz.filter(i => i.classification === cls).length;
              const intense = cls.startsWith('A') ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
                             cls.startsWith('B') ? 'bg-cyan-50 border-cyan-200 text-cyan-800' :
                             'bg-gray-50 border-gray-200 text-gray-600';
              return (
                <div key={cls} className={`rounded-lg border p-3 text-center ${intense}`}>
                  <div className="text-xl font-bold">{count}</div>
                  <div className="text-[11px] font-semibold mt-0.5">{cls}</div>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs">
                  <th className="text-left py-2 font-medium">SKU</th>
                  <th className="text-right py-2 font-medium">Ingresos</th>
                  <th className="text-center py-2 font-medium">ABC</th>
                  <th className="text-center py-2 font-medium">CV</th>
                  <th className="text-center py-2 font-medium">Clase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.abc_xyz.slice(0, 12).map(item => (
                  <tr key={item.sku}>
                    <td className="py-1.5 text-gray-700 text-xs">{item.sku}</td>
                    <td className="py-1.5 text-right text-gray-600 text-xs">${item.total_revenue.toLocaleString()}</td>
                    <td className="py-1.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.abc === 'A' ? 'bg-indigo-100 text-indigo-700' : item.abc === 'B' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>{item.abc}</span></td>
                    <td className="py-1.5 text-center text-xs text-gray-500 font-mono">{item.cv.toFixed(2)}</td>
                    <td className="py-1.5 text-center font-mono text-[11px] font-bold text-gray-700">{item.classification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Punto de reorden */}
      {data.advanced?.reorder_recommendations?.length > 0 && (
        <SectionCard title="Punto de Reorden" icon="📋" description="Calculo cientifico de cuando y cuanto pedir. Usa nivel de servicio 95% y lead time de 3 dias. Evita quiebres de stock en tus productos mas importantes.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs">
                  <th className="text-left py-2 font-medium">Producto</th>
                  <th className="text-right py-2 font-medium">Stock</th>
                  <th className="text-right py-2 font-medium">Dem/dia</th>
                  <th className="text-right py-2 font-medium">ROP</th>
                  <th className="text-right py-2 font-medium">Dias</th>
                  <th className="text-right py-2 font-medium">Pedir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.reorder_recommendations.map(r => (
                  <tr key={r.sku} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-700 truncate max-w-[140px]">{r.name}</td>
                    <td className="py-2 text-right text-gray-600">{r.current_stock}</td>
                    <td className="py-2 text-right text-gray-500">{r.daily_demand}</td>
                    <td className="py-2 text-right font-mono text-gray-800 font-medium">{r.reorder_point}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                        r.days_until_reorder <= 0 ? 'bg-red-100 text-red-700' :
                        r.days_until_reorder <= 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{r.days_until_reorder <= 0 ? 'YA' : r.days_until_reorder}</span>
                    </td>
                    <td className="py-2 text-right font-bold text-indigo-600">{r.recommended_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Anomalias */}
      {data.advanced?.anomalies?.length > 0 && (
        <SectionCard title="Anomalias Detectadas" icon="⚠️" description="Dias con ventas inusualmente altas o bajas detectadas con z-score. Investiga que causo cada anomalia: puede ser una oportunidad o un problema.">
          <div className="space-y-2">
            {data.advanced.anomalies.slice(-6).reverse().map((a, i) => (
              <div key={i} className={`flex items-center justify-between px-5 py-3 rounded-xl border ${
                a.type === 'spike' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'
              }`}>
                <div>
                  <span className="text-sm font-semibold text-gray-800">{a.date}</span>
                  <span className="text-xs text-gray-500 ml-3">Esperado: ${a.expected.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-base font-bold ${a.type === 'spike' ? 'text-emerald-700' : 'text-red-700'}`}>
                    ${a.revenue.toLocaleString()}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                    a.type === 'spike' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    z={a.z_score} {a.type === 'spike' ? '↑ Pico' : '↓ Caida'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Correlaciones */}
      {data.advanced?.correlations?.length > 0 && (
        <SectionCard title="Productos que se Venden Juntos" icon="🔗" description="Correlacion estadistica entre productos. Si dos productos tienen alta correlacion, considera venderlos juntos o crear paquetes para aumentar ventas.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.advanced.correlations.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/50 transition-colors">
                <div className={`w-3 h-3 rounded-full shrink-0 ${c.strength === 'strong' ? 'bg-indigo-500 shadow-lg shadow-indigo-200' : 'bg-cyan-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{c.product_a}</p>
                  <p className="text-sm text-gray-600 truncate">{c.product_b}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-indigo-600">{(c.correlation * 100).toFixed(0)}%</span>
                  <p className="text-[10px] text-gray-400">{c.strength === 'strong' ? 'Fuerte' : 'Moderada'}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Estacionalidad */}
      {data.advanced?.seasonality?.has_seasonality && (
        <SectionCard title={`Estacionalidad Anual`} icon="📅" description={`Tu negocio tiene patrones estacionales. Pico en ${data.advanced.seasonality.peak_month}, valle en ${data.advanced.seasonality.low_month}. Programa tus compras y personal segun la temporada.`}>
          <div className="flex items-end gap-2 h-40 px-4">
            {Object.entries(data.advanced.seasonality.monthly_index).map(([month, val]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-600">{val.toFixed(1)}</span>
                <div className={`w-full rounded-t-lg transition-all ${
                  val >= 1.2 ? 'bg-indigo-500' :
                  val >= 1.0 ? 'bg-indigo-400' :
                  val >= 0.8 ? 'bg-gray-300' : 'bg-gray-200'
                }`}
                  style={{ height: `${Math.max(8, val * 60)}px` }} />
                <span className="text-[10px] text-gray-400 font-medium">{month}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Rotacion */}
      {data.advanced?.turnover?.length > 0 && (
        <SectionCard title="Rotacion de Inventario" icon="🔄" description="Que tan rapido vendes cada producto. Alta rotacion = producto saludable. Baja rotacion = capital estancado. Usa esta metrica para decidir que productos descontinuar o promocionar.">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs">
                  <th className="text-left py-2 font-medium">Producto</th>
                  <th className="text-right py-2 font-medium">Vendido</th>
                  <th className="text-right py-2 font-medium">Stock</th>
                  <th className="text-right py-2 font-medium">Rotacion</th>
                  <th className="text-right py-2 font-medium">Dias/venta</th>
                  <th className="text-center py-2 font-medium">Eficiencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.turnover.slice(0, 15).map(t => (
                  <tr key={t.sku}>
                    <td className="py-2 text-gray-700 truncate max-w-[140px] font-medium">{t.name}</td>
                    <td className="py-2 text-right text-gray-600">{t.units_sold}</td>
                    <td className="py-2 text-right text-gray-500">{t.current_stock}</td>
                    <td className="py-2 text-right font-mono text-gray-800 font-medium">{t.turnover_ratio}x</td>
                    <td className="py-2 text-right text-gray-500">{t.days_to_sell}d</td>
                    <td className="py-2 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        t.efficiency === 'high' ? 'bg-emerald-100 text-emerald-700' :
                        t.efficiency === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {t.efficiency === 'high' ? 'Alta' : t.efficiency === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Price Insights */}
      {data.advanced?.price_insights?.length > 0 && (
        <SectionCard title="Analisis de Precios" icon="💲" description="Relacion precio-demanda por producto. Identifica productos donde podrias ajustar precios para maximizar ganancias sin perder ventas.">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.advanced.price_insights.slice(0, 9).map(p => (
              <div key={p.sku} className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 font-mono mb-1">{p.sku}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-lg font-bold text-gray-900">${p.price.toLocaleString()}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.margin_pct > 40 ? 'bg-emerald-100 text-emerald-700' :
                    p.margin_pct > 20 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>Margen {p.margin_pct}%</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[10px]">
                  <span className="text-gray-500">Demanda: {p.avg_daily_demand}/dia</span>
                  <span className={`font-semibold ${
                    p.suggested_action === 'increase_price' ? 'text-emerald-600' :
                    p.suggested_action === 'consider_discount' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {p.suggested_action === 'increase_price' ? 'Subir precio' :
                     p.suggested_action === 'consider_discount' ? 'Evaluar descuento' : 'Mantener'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* User Performance */}
      {data.advanced?.user_performance?.length > 0 && (
        <SectionCard title="Rendimiento por Usuario" icon="👥" description="Mide la productividad de cada persona que registra operaciones. Identifica quien vende mas, quien tiene mejor ticket promedio, y quien mueve mas productos. Util para incentivos, comisiones y detectar necesidades de capacitacion.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs">
                  <th className="text-left py-2 font-medium">Usuario</th>
                  <th className="text-right py-2 font-medium">Ingresos</th>
                  <th className="text-right py-2 font-medium">Unidades</th>
                  <th className="text-right py-2 font-medium">Dias activo</th>
                  <th className="text-right py-2 font-medium">Productos</th>
                  <th className="text-right py-2 font-medium">Ticket prom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.user_performance.map(u => (
                  <tr key={u.user} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-800 font-medium">{u.user}</td>
                    <td className="py-2 text-right text-gray-600">${u.total_revenue.toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-600">{u.total_units_sold}</td>
                    <td className="py-2 text-right text-gray-500">{u.active_days}</td>
                    <td className="py-2 text-right text-gray-500">{u.unique_products}</td>
                    <td className="py-2 text-right font-semibold text-indigo-600">${u.avg_ticket.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Peak Hours */}
      {data.advanced?.peak_hours?.length > 0 && data.advanced.peak_hours.some(h => h.revenue > 0) && (
        <SectionCard title="Horas Pico de Venta" icon="⏰" description="Descubre en que franjas horarias vendes mas. Programa a tu personal en las horas de mayor movimiento, prepara el inventario antes de los picos, y evita tener gente sin hacer nada en horas valle.">
          <div className="flex items-end gap-1 h-32">
            {data.advanced.peak_hours.map(h => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full rounded-t transition-all ${
                  h.revenue > 0 ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
                  style={{ height: `${Math.max(4, h.revenue / Math.max(1, ...data.advanced!.peak_hours.map(x => x.revenue)) * 100)}px` }} />
                <span className="text-[10px] text-gray-400">{h.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-gray-400">
            <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </SectionCard>
      )}

      {/* Day of Week */}
      {data.advanced?.day_of_week?.length > 0 && data.advanced.day_of_week.some(d => d.revenue > 0) && (
        <SectionCard title="Ventas por Dia de la Semana" icon="📆" description="Identifica tus dias fuertes y debiles. Refuerza el inventario antes de los dias pico y aprovecha los dias flojos para hacer inventario, mantenimiento o promociones especiales que atraigan clientes.">
          <div className="flex items-end gap-3 h-36 px-2">
            {data.advanced.day_of_week.map(d => {
              const maxRev = Math.max(1, ...data.advanced!.day_of_week.map(x => x.revenue));
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">{d.transactions}</span>
                  <div className={`w-full rounded-t-lg transition-all ${
                    d.revenue / maxRev > 0.7 ? 'bg-indigo-500' :
                    d.revenue / maxRev > 0.3 ? 'bg-indigo-300' : 'bg-gray-200'
                  }`}
                    style={{ height: `${Math.max(8, d.revenue / maxRev * 110)}px` }} />
                  <span className="text-[11px] text-gray-500 font-medium">{d.label.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Adjustments */}
      {data.advanced?.adjustment_analysis?.length > 0 && (
        <SectionCard title="Productos con Mas Ajustes" icon="🔧" description="Productos que requieren correcciones frecuentes de inventario. Puede indicar errores en el registro, robos, mermas no reportadas, o problemas de calidad. Investiga la causa raiz para reducir perdidas.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs">
                  <th className="text-left py-2 font-medium">Producto</th>
                  <th className="text-right py-2 font-medium">Ajustes</th>
                  <th className="text-right py-2 font-medium">Cantidad total</th>
                  <th className="text-right py-2 font-medium">Stock actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.advanced.adjustment_analysis.map(a => (
                  <tr key={a.sku} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-800 truncate max-w-[160px]">{a.name}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                        a.adjustment_count > 5 ? 'bg-red-100 text-red-700' :
                        a.adjustment_count > 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{a.adjustment_count}</span>
                    </td>
                    <td className="py-2 text-right text-gray-600">{a.total_qty_adjusted}</td>
                    <td className="py-2 text-right text-gray-500">{a.current_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Sales vs Purchases */}
      {data.advanced?.sales_vs_purchases?.length > 0 && (
        <SectionCard title="Compras vs Ventas" icon="⚖️" description="Compara lo que compras contra lo que vendes dia a dia. Un desbalance prolongado indica que estas acumulando inventario (compras > ventas) o desabasteciendote (ventas > compras). Ajusta tus ordenes de compra segun esta metrica.">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.advanced.sales_vs_purchases.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={45} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="sales" name="Ventas" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" name="Compras" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const borders: Record<string, string> = { indigo: 'border-indigo-200', emerald: 'border-emerald-200', amber: 'border-amber-200', red: 'border-red-200', gray: 'border-gray-200' };
  return (
    <div className={`rounded-xl border ${borders[color] || 'border-gray-200'} bg-white shadow-sm p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
    </div>
  );
}

function SectionCard({ title, icon, description, children }: { title: string; icon: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function AbcBadge({ label, count, desc, color }: { label: string; count: number; desc: string; color: string }) {
  const colors: Record<string, string> = { indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700', cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700', gray: 'bg-gray-50 border-gray-200 text-gray-600' };
  return (
    <div className={`flex-1 rounded-xl border ${colors[color]} p-4 text-center`}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
    </div>
  );
}
