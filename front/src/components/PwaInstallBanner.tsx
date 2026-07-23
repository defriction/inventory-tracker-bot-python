'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2 } from 'lucide-react';

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }

    const ua = navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/.test(ua.toLowerCase()));

    // Check if dismissed in last 24h
    const d = localStorage.getItem('pwa_dismissed');
    if (d && Date.now() - parseInt(d) < 86400000) return;

    // Chrome/Edge/Android — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS doesn't fire the event — show after a delay
    const t = setTimeout(() => {
      if (isIos) setShow(true);
      // Also show for desktop where event might not fire
      if (!isIos && !window.matchMedia('(display-mode: standalone)').matches) {
        setShow(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(t);
    };
  }, []);

  const install = async () => {
    if (prompt) {
      prompt.prompt();
      const r = await prompt.userChoice;
      if (r.outcome === 'accepted') {
        setShow(false);
        localStorage.setItem('pwa_dismissed', Date.now().toString());
      }
      setPrompt(null);
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_dismissed', Date.now().toString());
  };

  if (!show || isStandalone) return null;

  return (
    <div className="rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-indigo-50 p-5 shadow-md shadow-indigo-100/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-violet-100/50 rounded-full blur-2xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Instalar App</h4>
              <p className="text-[10px] text-gray-500">Acceso rapido desde tu pantalla de inicio</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isIos ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/80 border border-gray-200">
            <Share2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Toca el boton <strong>Compartir</strong> en Safari y selecciona <strong>"Agregar a pantalla de inicio"</strong>
            </p>
          </div>
        ) : (
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
          >
            <Smartphone className="w-4 h-4" />
            Instalar en mi dispositivo
          </button>
        )}
      </div>
    </div>
  );
}
