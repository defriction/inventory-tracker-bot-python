'use client';

import { useState } from 'react';
import { Bot, Package, ArrowRight, Zap, TrendingUp, Shield, Smartphone } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-[#f5f6f8]">
      {/* PWA Banner */}
      <PwaInstallBanner />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left — Branding + Illustration */}
        <div className="relative lg:w-5/12 xl:w-1/2 min-h-[320px] lg:min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex flex-col justify-center p-6 sm:p-10 lg:p-16 overflow-hidden">
          {/* Glass blobs */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-56 h-56 sm:w-72 sm:h-72 bg-violet-400/20 rounded-full blur-3xl" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 w-40 h-40 sm:w-56 sm:h-56 bg-indigo-300/15 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" style={{ animationDelay: '1s' }} />
          </div>

          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          {/* Content */}
          <div className="relative z-10 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Inventario Inteligente</h1>
                <p className="text-xs sm:text-sm text-indigo-200/80">by defriction</p>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3 lg:mb-4 max-w-md mx-auto lg:mx-0">
              Tu inventario,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">siempre bajo control</span>
            </h2>
            <p className="text-sm sm:text-base text-indigo-200/80 leading-relaxed mb-6 lg:mb-8 max-w-md mx-auto lg:mx-0">
              Gestiona productos, ventas y compras desde Telegram. Analytics en tiempo real. Todo en un solo lugar.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 border border-white/10 text-xs sm:text-sm text-white backdrop-blur-sm">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" /> Telegram
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 border border-white/10 text-xs sm:text-sm text-white backdrop-blur-sm">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" /> Analytics IA
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 border border-white/10 text-xs sm:text-sm text-white backdrop-blur-sm">
                <Smartphone className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300" /> PWA Móvil
              </span>
            </div>
          </div>

          {/* SVG Illustration — hidden on small mobile */}
          <div className="relative z-10 hidden sm:block mt-8 lg:mt-12">
            <svg viewBox="0 0 400 180" className="w-full max-w-sm mx-auto lg:mx-0 opacity-80" fill="none">
              <rect x="40" y="120" width="320" height="6" rx="3" fill="white" opacity="0.15" />
              <rect x="40" y="160" width="320" height="6" rx="3" fill="white" opacity="0.1" />
              <rect x="60" y="90" width="55" height="30" rx="6" fill="white" opacity="0.2" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
              <rect x="125" y="95" width="40" height="25" rx="6" fill="white" opacity="0.15" stroke="white" strokeWidth="1" strokeOpacity="0.15" />
              <rect x="175" y="88" width="50" height="32" rx="6" fill="white" opacity="0.18" stroke="white" strokeWidth="1" strokeOpacity="0.18" />
              <rect x="60" y="130" width="40" height="28" rx="5" fill="white" opacity="0.1" />
              <rect x="110" y="135" width="55" height="25" rx="5" fill="white" opacity="0.12" />
              <rect x="175" y="128" width="45" height="32" rx="5" fill="white" opacity="0.1" />
              <rect x="230" y="132" width="35" height="28" rx="5" fill="white" opacity="0.08" />
              <circle cx="340" cy="60" r="14" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
              <line x1="351" y1="71" x2="358" y2="78" stroke="white" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Right — Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#f5f6f8]">
          <div className="w-full max-w-sm sm:max-w-md">
            {/* Logo for mobile */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                <Package className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Bienvenido</h3>
              <p className="text-sm text-gray-500 mt-1">Ingresa tu token de acceso</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <Package className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</h3>
              <p className="text-gray-500 mt-1">Ingresa tu token para acceder al dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="p-3 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center animate-in fade-in">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Token de Acceso</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="Ej: AB1234"
                  className="w-full px-4 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm sm:text-base
                    focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-sm"
                  style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
                  autoFocus
                  inputMode="text"
                  autoCapitalize="characters"
                />
              </div>

              <button
                type="submit"
                disabled={token.length < 6 || loading}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-sm sm:text-base font-semibold
                  bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:from-indigo-700 active:to-indigo-600
                  text-white disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5
                  flex items-center justify-center gap-2"
                style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  <>Ingresar al Dashboard <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-xs text-center text-gray-400 pt-1">
                Usa el mismo token que configuraste en{' '}
                <a href="https://t.me/SmartInventoryBot" className="text-indigo-600 font-medium hover:text-indigo-500 underline underline-offset-2" target="_blank" rel="noopener">
                  Telegram
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
