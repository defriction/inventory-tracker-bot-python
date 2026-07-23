'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2 } from 'lucide-react';

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/.test(ua.toLowerCase()));

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const t = setTimeout(() => setShow(true), 3000);
    return () => { window.removeEventListener('beforeinstallprompt', handler); clearTimeout(t); };
  }, []);

  const install = async () => {
    if (prompt) { prompt.prompt(); await prompt.userChoice; setPrompt(null); }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] w-72 animate-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl border border-indigo-200 bg-white shadow-xl shadow-indigo-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-indigo-50/50 border-b border-indigo-100/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Instalar App</span>
          </div>
          <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {isIos ? (
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Toca <strong>Compartir</strong> en Safari y selecciona <strong>"Agregar a inicio"</strong>
            </p>
          ) : (
            <button
              onClick={install}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
