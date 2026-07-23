'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bot, LayoutDashboard, Package, BarChart3, Truck, FileText, Activity, LogOut
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
import PwaInstallBanner from '@/components/PwaInstallBanner';

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
  const [scrollY, setScrollY] = useState(0);

  const isAdmin = token === '3HF784F';

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="min-h-screen bg-[#f5f6f8]" suppressHydrationWarning>
      <PwaInstallBanner />
      {/* Zeus-style Glass Navbar */}
      <nav className={`sticky top-3 z-50 mx-auto max-w-fit transition-all duration-300 ${
        scrollY > 20 ? 'px-4' : 'px-2'
      }`}>
        <div className={`relative flex items-center gap-1 px-2 py-1.5 rounded-2xl transition-all duration-500 ${
          scrollY > 20
            ? 'bg-white/70 backdrop-blur-2xl border border-white/40 shadow-lg shadow-black/[0.02]'
            : 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-md shadow-black/[0.01]'
        }`}>
          {/* Liquid glass highlight */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/60 via-transparent to-transparent pointer-events-none" />

          {/* Logo */}
          <div className="relative flex items-center gap-2 pr-2 mr-1 border-r border-gray-200/60">
            <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="hidden sm:block text-xs font-semibold text-gray-700 tracking-tight">Inventario</span>
          </div>

          {/* Nav items */}
          <div className="relative flex items-center gap-0.5">
            {visibleNav.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === item.id
                    ? 'bg-white text-gray-900 shadow-sm shadow-black/[0.03] scale-[1.02]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="hidden sm:inline">{item.label}</span>
                {/* Active indicator dot for mobile */}
                {activeTab === item.id && (
                  <span className="sm:hidden absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600" />
                )}
              </button>
            ))}
          </div>

          {/* Right — logout */}
          <div className="relative flex items-center pl-2 ml-1 border-l border-gray-200/60">
            <span className="hidden sm:block text-[10px] text-gray-400 font-mono mr-2 bg-gray-100/80 px-1.5 py-0.5 rounded-md">{token.slice(0, 4)}</span>
            <button
              onClick={() => { setIsAuthenticated(false); localStorage.removeItem('inventory_token'); localStorage.removeItem('inventory_auth'); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-all duration-200"
              title="Cerrar sesion"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-300">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <StatsCards token={token} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><RecentMovements token={token} /></div>
              <div className="lg:col-span-1 space-y-4">
                <AlertsPanel token={token} />
              </div>
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          <div><InventoryTable token={token} /></div>
        ) : activeTab === 'analytics' ? (
          <div><AnalyticsPanel token={token} /></div>
        ) : activeTab === 'orders' ? (
          <div><OrderTracker token={token} /></div>
        ) : activeTab === 'po_builder' ? (
          <div><PurchaseOrderBuilder token={token} /></div>
        ) : (
          <div><UsageStats token={token} /></div>
        )}
      </main>
    </div>
  );
}
