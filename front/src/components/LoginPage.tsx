'use client';

import { useState } from 'react';
import { Bot, Package, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-white flex flex-col">
      <PwaInstallBanner />

      {/* Mobile + Tablet: vertical layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left — Branding (compact on mobile, full on desktop) */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex flex-col justify-center overflow-hidden
          py-10 px-6 sm:py-12 sm:px-8
          lg:w-5/12 lg:py-16 lg:px-16 lg:min-h-screen">

          {/* Glass blobs */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-40 h-40 sm:w-56 sm:h-56 bg-white/10 rounded-full translate-x-1/4 -translate-y-1/4 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-64 sm:h-64 bg-violet-400/20 rounded-full -translate-x-1/4 translate-y-1/4 blur-3xl" />
          </div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Inventario Inteligente</h1>
                <p className="text-[10px] sm:text-xs text-indigo-200/80">Haciendo crecer tu negocio</p>
              </div>
            </div>
          </div>

          {/* SVG Illustration — only on desktop */}
          <div className="relative z-10 hidden lg:block mt-8">
            <svg viewBox="0 0 400 160" className="w-full max-w-sm mx-auto opacity-80" fill="none">
              <rect x="40" y="110" width="320" height="5" rx="2.5" fill="white" opacity="0.12" />
              <rect x="40" y="145" width="320" height="5" rx="2.5" fill="white" opacity="0.08" />
              <rect x="60" y="80" width="50" height="30" rx="6" fill="white" opacity="0.18" stroke="white" strokeWidth="1" strokeOpacity="0.18" />
              <rect x="120" y="85" width="38" height="25" rx="5" fill="white" opacity="0.14" stroke="white" strokeWidth="0.8" strokeOpacity="0.14" />
              <rect x="168" y="78" width="48" height="32" rx="6" fill="white" opacity="0.16" stroke="white" strokeWidth="1" strokeOpacity="0.16" />
              <rect x="240" y="90" width="40" height="20" rx="5" fill="white" opacity="0.1" />
              <rect x="300" y="85" width="45" height="25" rx="5" fill="white" opacity="0.12" />
              <circle cx="360" cy="55" r="12" stroke="white" strokeWidth="1.5" strokeOpacity="0.18" />
              <line x1="369" y1="64" x2="375" y2="70" stroke="white" strokeWidth="1.5" strokeOpacity="0.18" strokeLinecap="round" />
              <path d="M20 70 L45 70" stroke="white" strokeWidth="1.5" strokeOpacity="0.12" strokeLinecap="round" />
              <path d="M38 64 L45 70 L38 76" stroke="white" strokeWidth="1.5" strokeOpacity="0.12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Right — Form (main focus on mobile) */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-8 sm:py-16 lg:px-16 bg-[#f5f6f8]">
          <div className="w-full max-w-sm">

            {/* Heading for mobile */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-sm">
                <Package className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Ingresa tu token</h2>
              <p className="text-sm text-gray-500 mt-1">Accede a tu dashboard</p>
            </div>

            {/* Heading for desktop */}
            <div className="hidden lg:block text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm">
                <Package className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</h2>
              <p className="text-gray-500 mt-1">Ingresa tu token para acceder al dashboard</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Token de Acceso</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="Ej: AB1234"
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base
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
                className="w-full py-3.5 rounded-xl text-base font-semibold
                  bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                  text-white disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200 shadow-lg shadow-indigo-500/25
                  flex items-center justify-center gap-2"
                style={{ fontFeatureSettings: "'cv01', 'ss03'" }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Ingresar <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-xs text-center text-gray-400 pt-1">
                Mismo token de{' '}
                <a href="https://t.me/SmartInventoryBot" className="text-indigo-600 font-medium hover:text-indigo-500" target="_blank" rel="noopener">Telegram</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
