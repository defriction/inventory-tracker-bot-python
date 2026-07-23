'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share2 } from 'lucide-react';

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
    if (window.matchMedia('(display-mode: standalone)').matches) { setIsStandalone(true); return; }
    const ua = window.navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/.test(ua.toLowerCase()));
    const stored = localStorage.getItem('pwa-banner-dismissed');
    if (stored && Date.now() - parseInt(stored, 10) < 3 * 24 * 60 * 60 * 1000) { setDismissed(true); }

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); setShowBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    const t = setTimeout(() => { if (isIos && !dismissed) setShowBanner(true); }, 5000);
    return () => { window.removeEventListener('beforeinstallprompt', handler); clearTimeout(t); };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; if (r.outcome === 'accepted') setShowBanner(false); setDeferredPrompt(null); }
  };

  const handleDismiss = () => { setShowBanner(false); setDismissed(true); localStorage.setItem('pwa-banner-dismissed', Date.now().toString()); };

  if (!showBanner || dismissed || isStandalone) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> App Movil
        </h4>
        <button onClick={handleDismiss} className="text-indigo-400 hover:text-indigo-600"><X className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs text-indigo-600/80 leading-relaxed">
        {isIos ? 'Toca ' + <Share2 className="w-3 h-3 inline" /> + ' en Safari y "Agregar a pantalla de inicio"' : 'Instala esta app para usarla sin abrir el navegador'}
      </p>
      {!isIos && (
        <button onClick={handleInstall} className="mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors">
          Instalar App
        </button>
      )}
    </div>
  );
}
