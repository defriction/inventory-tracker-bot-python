'use client';

import { useState } from 'react';
import { Bot, LayoutDashboard, Package, BarChart3, LogOut } from 'lucide-react';
import StatsCards from '@/components/StatsCards';
import AlertsPanel from '@/components/AlertsPanel';
import RecentMovements from '@/components/RecentMovements';
import InventoryTable from '@/components/InventoryTable';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import PwaInstallBanner from '@/components/PwaInstallBanner';

type Tab = 'dashboard' | 'inventory' | 'analytics';

export default function Home() {
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('inventory_token') || '';
    return '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('inventory_auth') === 'true';
    return false;
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/stats?token=${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Token invalido. Verifica e intenta de nuevo.');
        return;
      }
      setIsAuthenticated(true);
      localStorage.setItem('inventory_token', token);
      localStorage.setItem('inventory_auth', 'true');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-[#f7f8f8] px-4">
          <div className="w-full max-w-md">
            <div className="relative rounded-2xl sm:rounded-3xl border border-gray-200 bg-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-gray-200/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-100 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
              <div className="relative z-10 text-center">
                <Bot className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold text-gray-900 tracking-[-0.5px] mb-2" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Inventario Inteligente</h1>
                <p className="text-sm text-gray-500 mb-8">Gestiona tu inventario desde Telegram y monitorea todo desde aqui</p>

                <form onSubmit={handleLogin} className="space-y-4 text-left">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">{error}</div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Token de Acceso</label>
                    <input type="text" value={token} onChange={(e) => setToken(e.target.value.toUpperCase())} placeholder="Ej: AB1234"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      style={{ fontFeatureSettings: "'cv01', 'ss03'" }} />
                  </div>
                  <button type="submit" disabled={token.length < 6 || loading}
                    className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                    style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
                    {loading ? 'Verificando...' : 'Ingresar al Dashboard'}
                  </button>
                </form>
                <p className="mt-6 text-xs text-center text-gray-400">Usa el mismo token que configuraste en Telegram</p>
              </div>
            </div>
          </div>
        </div>
        <PwaInstallBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f8]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand + Tabs */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-gray-900 leading-tight">Inventario Inteligente</h1>
                  <p className="text-[10px] text-gray-400 leading-tight">SaaS para PyMEs</p>
                </div>
              </div>

              <div className="h-6 w-px bg-gray-200 hidden sm:block" />

              <div className="flex bg-gray-100 rounded-xl p-0.5">
                <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5">Dashboard</span>
                </TabButton>
                <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')}>
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5">Inventario</span>
                </TabButton>
                <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5">Analytics</span>
                </TabButton>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsAuthenticated(false); localStorage.removeItem('inventory_token'); localStorage.removeItem('inventory_auth'); }}
                className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar sesion</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StatsCards token={token} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2"><RecentMovements token={token} /></div>
              <div className="lg:col-span-1 space-y-4">
                <AlertsPanel token={token} />
                <PwaInstallBanner />
              </div>
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Inventario Completo</h2>
              <p className="text-sm text-gray-500 mt-1">Busca, filtra y gestiona todos tus productos</p>
            </div>
            <InventoryTable token={token} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Analytics de Negocio</h2>
              <p className="text-sm text-gray-500 mt-1">Revenue, tendencias, margenes y recomendaciones</p>
            </div>
            <AnalyticsPanel token={token} />
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-center text-gray-400">Inventario Inteligente · Gestiona desde <a href="https://t.me/SmartInventoryBot" className="text-indigo-600 hover:text-indigo-500">Telegram</a></p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center px-3.5 py-2 rounded-[10px] text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-white text-gray-900 shadow-sm shadow-gray-200/50'
          : 'text-gray-500 hover:text-gray-700'
      }`}
      style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
      {children}
    </button>
  );
}
