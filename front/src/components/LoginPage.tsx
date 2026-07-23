'use client';

import { useState } from 'react';
import { Bot, Package, ArrowRight, Shield, Zap, TrendingUp } from 'lucide-react';
import PwaInstallBanner from './PwaInstallBanner';

interface Props {
  onLogin: (token: string) => void;
  loading: boolean;
  error: string;
}

export default function LoginPage({ onLogin, loading, error }: Props) {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length >= 6) onLogin(token);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Branding */}
      <div className="relative lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-violet-400 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Inventario Inteligente</h1>
              <p className="text-sm text-indigo-200">by defriction</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              Tu inventario,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">mas inteligente</span>
            </h2>
            <p className="text-lg text-indigo-200/80 leading-relaxed mb-8">
              Gestiona productos, ventas y compras desde Telegram. Analytics en tiempo real. Todo en un solo lugar.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm text-white backdrop-blur">
              <Zap className="w-4 h-4 text-amber-400" /> Bot Telegram
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm text-white backdrop-blur">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Analytics IA
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm text-white backdrop-blur">
              <Shield className="w-4 h-4 text-blue-300" /> PWA Movil
            </span>
          </div>
        </div>

        {/* Bottom info */}
        <div className="relative z-10 mt-12">
          <div className="flex items-center gap-6 text-sm text-indigo-200/70">
            <span>© defriction 2026</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400/50" />
            <span>v2.0</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white relative">
        {/* PWA Banner popup — top right */}
        <div className="absolute top-4 right-4 z-20 w-72">
          <PwaInstallBanner />
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido de vuelta</h3>
            <p className="text-gray-500">Ingresa tu token para acceder al dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Token de Acceso</label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="Ej: AB1234"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm
                    focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={token.length < 6 || loading}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold
                bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                text-white disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg shadow-indigo-500/25
                flex items-center justify-center gap-2"
              style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
            >
              {loading ? 'Verificando...' : (
                <>Ingresar al Dashboard <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-xs text-center text-gray-400 pt-2">
              Usa el mismo token de acceso que configuraste en{' '}
              <a href="https://t.me/SmartInventoryBot" className="text-indigo-600 font-medium hover:text-indigo-500" target="_blank" rel="noopener">
                Telegram
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
