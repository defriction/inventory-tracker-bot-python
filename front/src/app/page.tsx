'use client';

import { useState, useEffect } from 'react';
import {
  Bot, LayoutDashboard, Package, BarChart3, Truck, FileText, Activity,
  LogOut, Search, Bell, ChevronDown, Plus, MoreHorizontal, Calendar, Clock
} from 'lucide-react';
import StatsCards from '@/components/StatsCards';
import AlertsPanel from '@/components/AlertsPanel';
import RecentMovements from '@/components/RecentMovements';
import InventoryTable from '@/components/InventoryTable';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import OrderTracker from '@/components/OrderTracker';
import PurchaseOrderBuilder from '@/components/PurchaseOrderBuilder';
import UsageStats from '@/components/UsageStats';
import LoginPage from '@/components/LoginPage';

type Tab = 'dashboard' | 'inventory' | 'analytics' | 'orders' | 'po_builder' | 'usage';

const navItems: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'orders', label: 'Pedidos', icon: Truck },
  { id: 'po_builder', label: 'Armar Pedido', icon: FileText },
  { id: 'usage', label: 'Uso', icon: Activity, adminOnly: true },
];

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = token === '3HF784F';

  useEffect(() => {
    if (!isAuthenticated) return;
    const labels: Record<string, string> = { dashboard: 'Dashboard', inventory: 'Inventario', analytics: 'Analytics', orders: 'Pedidos', po_builder: 'Armar Pedido' };
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/usage/track?token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'tab_view', category: 'navigation', tab: labels[activeTab] || activeTab }),
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
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Token invalido'); return; }
      setIsAuthenticated(true);
      localStorage.setItem('inventory_token', t);
      localStorage.setItem('inventory_auth', 'true');
    } catch { setError('No se pudo conectar.'); }
    finally { setLoading(false); }
  };

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} loading={loading} error={error} />;

  const visibleNav = navItems.filter(n => !n.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Backdrop mobile */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className="relative z-10 flex-1 flex flex-col">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Inventario</h1>
                <p className="text-[10px] text-gray-400">Inteligente</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {visibleNav.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* User area */}
          <div className="px-4 py-4 border-t border-gray-50">
            <button
              onClick={() => { setIsAuthenticated(false); localStorage.removeItem('inventory_token'); localStorage.removeItem('inventory_auth'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Cerrar sesion
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <h2 className="text-sm font-semibold text-gray-700">
                {visibleNav.find(n => n.id === activeTab)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2.5 py-1 rounded-lg">{token.slice(0, 6)}</span>
              {isAdmin && <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Admin</span>}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {activeTab === 'dashboard' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <StatsCards token={token} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><RecentMovements token={token} /></div>
                <div className="lg:col-span-1 space-y-4">
                  <AlertsPanel token={token} />
                </div>
              </div>
            </div>
          ) : activeTab === 'inventory' ? (
            <div className="animate-in fade-in duration-300">
              <InventoryTable token={token} />
            </div>
          ) : activeTab === 'analytics' ? (
            <div className="animate-in fade-in duration-300">
              <AnalyticsPanel token={token} />
            </div>
          ) : activeTab === 'orders' ? (
            <div className="animate-in fade-in duration-300">
              <OrderTracker token={token} />
            </div>
          ) : activeTab === 'po_builder' ? (
            <div className="animate-in fade-in duration-300">
              <PurchaseOrderBuilder token={token} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <UsageStats token={token} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
