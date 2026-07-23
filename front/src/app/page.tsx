'use client';

import { useState } from 'react';
import StatsCards from '@/components/StatsCards';
import AlertsPanel from '@/components/AlertsPanel';
import RecentMovements from '@/components/RecentMovements';
import InventoryTable from '@/components/InventoryTable';

type Tab = 'dashboard' | 'inventory';

export default function Home() {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length >= 6) {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090a]">
        {/* Login glass card */}
        <div className="w-full max-w-md mx-4">
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-2xl">
            {/* Glass highlight */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/[0.03] rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="relative z-10">
              <div className="text-center mb-8">
                <span className="text-4xl block mb-4">🤖</span>
                <h1 className="text-2xl font-semibold text-[#f7f8f8] tracking-[-0.5px] mb-2"
                  style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
                  Inventario Inteligente
                </h1>
                <p className="text-sm text-[#8a8f98] leading-relaxed">
                  Gestiona tu inventario desde Telegram y monitorea todo desde aquí
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-2 uppercase tracking-wider">
                    Token de Acceso
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    placeholder="Ej: AB1234"
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg
                      text-[#f7f8f8] placeholder-[#62666d] text-sm
                      focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                      transition-all duration-200"
                    style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={token.length < 6}
                  className="w-full py-3 px-4 rounded-lg text-sm font-medium
                    bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                    text-white disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200 shadow-lg shadow-indigo-500/10"
                  style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
                >
                  Ingresar al Dashboard
                </button>
              </form>

              <p className="mt-6 text-xs text-center text-[#62666d] leading-relaxed">
                Usa el mismo token que configuraste en Telegram
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090a]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#08090a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <span className="text-xl">🤖</span>
              <div className="flex gap-1">
                <TabButton
                  active={activeTab === 'dashboard'}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </TabButton>
                <TabButton
                  active={activeTab === 'inventory'}
                  onClick={() => setActiveTab('inventory')}
                >
                  Inventario
                </TabButton>
              </div>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs text-[#8a8f98] hover:text-[#d0d6e0] transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.04]"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StatsCards token={token} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <RecentMovements token={token} />
              </div>
              <div className="lg:col-span-1">
                <AlertsPanel token={token} />
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#f7f8f8] tracking-[-0.3px]"
                style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
                Inventario Completo
              </h2>
              <p className="text-sm text-[#8a8f98] mt-1">
                Busca, filtra y gestiona todos tus productos
              </p>
            </div>
            <InventoryTable token={token} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-center text-[#62666d]">
            Inventory Bot SaaS · Gestiona desde{' '}
            <a href="https://t.me/SmartInventoryBot" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Telegram
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-1.5 text-sm rounded-md transition-all duration-200 ${
        active
          ? 'text-[#f7f8f8] bg-white/[0.06]'
          : 'text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-white/[0.03]'
      }`}
      style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
    >
      {children}
    </button>
  );
}
