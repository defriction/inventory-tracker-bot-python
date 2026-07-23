'use client';

import { useState } from 'react';
import StatsCards from '@/components/StatsCards';
import AlertsPanel from '@/components/AlertsPanel';
import RecentMovements from '@/components/RecentMovements';
import InventoryTable from '@/components/InventoryTable';
import AnalyticsPanel from '@/components/AnalyticsPanel';

type Tab = 'dashboard' | 'inventory' | 'analytics';

export default function Home() {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    } catch {
      setError('No se pudo conectar con el servidor. Verifica tu conexion.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8f8]">
        <div className="w-full max-w-md mx-4">
          <div className="relative rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-xl p-8 shadow-xl shadow-gray-200/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-100 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="relative z-10">
              <div className="text-center mb-8">
                <span className="text-4xl block mb-4">🤖</span>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-[-0.5px] mb-2"
                  style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
                  Inventario Inteligente
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Gestiona tu inventario desde Telegram y monitorea todo desde aqui
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                    Token de Acceso
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    placeholder="Ej: AB1234"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg
                      text-gray-900 placeholder-gray-400 text-sm
                      focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                      transition-all duration-200"
                    style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={token.length < 6 || loading}
                  className="w-full py-3 px-4 rounded-lg text-sm font-medium
                    bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                    text-white disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200 shadow-lg shadow-indigo-500/20"
                  style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
                >
                  {loading ? 'Verificando...' : 'Ingresar al Dashboard'}
                </button>
              </form>

              <p className="mt-6 text-xs text-center text-gray-400 leading-relaxed">
                Usa el mismo token que configuraste en Telegram
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f8]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
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
                <TabButton
                  active={activeTab === 'analytics'}
                  onClick={() => setActiveTab('analytics')}
                >
                  Analytics
                </TabButton>
              </div>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100"
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
        ) : activeTab === 'inventory' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]"
                style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
                Inventario Completo
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Busca, filtra y gestiona todos tus productos
              </p>
            </div>
            <InventoryTable token={token} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 tracking-[-0.3px]"
                style={{ fontFeatureSettings: "'cv01', 'ss03'" }}>
                Analytics de Negocio
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Revenue, tendencias, margenes y recomendaciones
              </p>
            </div>
            <AnalyticsPanel token={token} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-center text-gray-400">
            Inventario Inteligente · Gestiona desde{' '}
            <a href="https://t.me/SmartInventoryBot" className="text-indigo-600 hover:text-indigo-500 transition-colors">
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
          ? 'text-gray-900 bg-gray-200/80'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
      style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
    >
      {children}
    </button>
  );
}
