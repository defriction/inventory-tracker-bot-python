'use client';

import { useState, useEffect } from 'react';
import { Bot, LayoutDashboard, Package, BarChart3, LogOut, Truck, FileText, Activity } from 'lucide-react';
import StatsCards from '@/components/StatsCards';
import AlertsPanel from '@/components/AlertsPanel';
import RecentMovements from '@/components/RecentMovements';
import InventoryTable from '@/components/InventoryTable';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import OrderTracker from '@/components/OrderTracker';
import PurchaseOrderBuilder from '@/components/PurchaseOrderBuilder';
import UsageStats from '@/components/UsageStats';
import LoginPage from '@/components/LoginPage';

type Tab = 'dashboard' | 'inventory' | 'analytics' | 'orders' | 'po_builder' | 'usage';

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

  const isAdmin = token === '3HF784F';

  useEffect(() => {
    if (!isAuthenticated) return;
    const tabLabels: Record<string, string> = { dashboard: 'Dashboard', inventory: 'Inventario', analytics: 'Analytics', orders: 'Pedidos', po_builder: 'Armar Pedido' };
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/usage/track?token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'tab_view', category: 'navigation', tab: tabLabels[activeTab] || activeTab }),
    }).catch(() => {});
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (t: string) => {
    setToken(t);
    setLoading(true);
    setError('');

    if (t === '3HF784F') {
      setIsAuthenticated(true);
      localStorage.setItem('inventory_token', t);
      localStorage.setItem('inventory_auth', 'true');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/stats?token=${t}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Token invalido. Verifica e intenta de nuevo.');
        return;
      }
      setIsAuthenticated(true);
      localStorage.setItem('inventory_token', t);
      localStorage.setItem('inventory_auth', 'true');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} loading={loading} error={error} />;
  }

  return (
    <div className="min-h-screen bg-[#f7f8f8]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-gray-900 leading-tight">Inventario Inteligente</h1>
                  <p className="text-[10px] text-gray-400 leading-tight">{isAdmin ? 'Panel Admin' : 'Haciendo crecer tu negocio'}</p>
                </div>
              </div>

              {!isAdmin && <div className="h-6 w-px bg-gray-200 hidden sm:block" />}

              {isAdmin ? (
                <div className="flex bg-gray-100 rounded-xl p-0.5">
                  <TabButton active={activeTab === 'usage'} onClick={() => setActiveTab('usage')}>
                    <Activity className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1.5">Uso</span>
                  </TabButton>
                </div>
              ) : (
                <div className="flex bg-gray-100 rounded-xl p-0.5">
                  <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}><LayoutDashboard className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Dashboard</span></TabButton>
                  <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')}><Package className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Inventario</span></TabButton>
                  <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}><BarChart3 className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Analytics</span></TabButton>
                  <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}><Truck className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Pedidos</span></TabButton>
                  <TabButton active={activeTab === 'po_builder'} onClick={() => setActiveTab('po_builder')}><FileText className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Armar Pedido</span></TabButton>
                </div>
              )}
            </div>

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
              </div>
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Inventario Completo</h2><p className="text-sm text-gray-500 mt-1">Busca, filtra y gestiona todos tus productos</p></div>
            <InventoryTable token={token} />
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Analytics de Negocio</h2><p className="text-sm text-gray-500 mt-1">Revenue, tendencias, margenes y recomendaciones</p></div>
            <AnalyticsPanel token={token} />
          </div>
        ) : activeTab === 'orders' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Seguimiento de Pedidos</h2><p className="text-sm text-gray-500 mt-1">Centraliza tus pedidos, proveedores y rastreo</p></div>
            <OrderTracker token={token} />
          </div>
        ) : activeTab === 'po_builder' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Armar Pedido</h2><p className="text-sm text-gray-500 mt-1">Genera ordenes de compra desde tu inventario</p></div>
            <PurchaseOrderBuilder token={token} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]" style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>Analytics de Uso</h2><p className="text-sm text-gray-500 mt-1">Como interactuan los usuarios con la aplicacion</p></div>
            <UsageStats token={token} />
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
        active ? 'bg-white text-gray-900 shadow-sm shadow-gray-200/50' : 'text-gray-500 hover:text-gray-700'
      }`}
      style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
      {children}
    </button>
  );
}
