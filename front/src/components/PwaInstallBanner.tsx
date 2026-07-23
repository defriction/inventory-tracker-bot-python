'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/.test(ua.toLowerCase()));

    // Check dismissed
    const stored = localStorage.getItem('pwa-banner-dismissed');
    if (stored) {
      const ts = parseInt(stored, 10);
      if (Date.now() - ts < 3 * 24 * 60 * 60 * 1000) { // 3 days
        setDismissed(true);
      }
    }

    // Chrome/Edge/Android — beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS doesn't fire beforeinstallprompt — show after 5s
    const iosTimer = setTimeout(() => {
      if (isIos && !dismissed) setShowBanner(true);
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(iosTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  if (!showBanner || dismissed || isStandalone) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Banner */}
      <div className="fixed bottom-6 left-4 right-4 z-[101] max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-2xl shadow-indigo-500/30 p-5 border border-indigo-400/20">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* App icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-3xl">🤖</span>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-white">Instalar Inventario Inteligente</h3>
              <p className="text-sm text-indigo-200 mt-1">
                {isIos
                  ? 'Toca el boton Compartir y luego "Agregar a pantalla de inicio"'
                  : 'Usa la app sin abrir el navegador — mas rapido y siempre a mano'}
              </p>
            </div>

            {!isIos && (
              <button
                onClick={handleInstall}
                className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50 active:bg-indigo-100 transition-colors shadow-lg"
              >
                Instalar App
              </button>
            )}
          </div>

          {isIos && (
            <div className="mt-3 pt-3 border-t border-white/10 text-center text-xs text-indigo-300">
              Busca el icono <span className="inline-block align-middle mx-0.5">📤</span> en Safari
            </div>
          )}
        </div>
      </div>
    </>
  );
}
