import React from 'react';
import { X, SlidersHorizontal, ShieldCheck } from '@phosphor-icons/react';

interface KeycloakConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;
}

export const KeycloakConfigModal: React.FC<KeycloakConfigModalProps> = ({
  isOpen,
  onClose,
  apiBaseUrl,
  setApiBaseUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn">
      <div className="liquid-glass rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative border border-zinc-700">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <SlidersHorizontal weight="bold" className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Cấu hình Keycloak & Gateway Endpoint</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 text-xs">
          
          {/* API Base URL selection */}
          <div className="space-y-1.5">
            <label className="font-medium text-zinc-300">API Gateway Endpoint URL</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setApiBaseUrl('')}
                className={`p-3 rounded-xl border text-left font-mono transition-all ${
                  apiBaseUrl === ''
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="block text-[10px] text-zinc-500 font-sans uppercase">API Gateway (Vite Proxy)</span>
                :8888 via proxy
              </button>

              <button
                type="button"
                onClick={() => setApiBaseUrl('http://localhost:8081')}
                className={`p-3 rounded-xl border text-left font-mono transition-all ${
                  apiBaseUrl.includes('8081')
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="block text-[10px] text-zinc-500 font-sans uppercase">Direct Profile Service</span>
                http://localhost:8081
              </button>
            </div>
          </div>

          {/* Keycloak Realm Specs */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-mono flex items-center space-x-1.5">
                <ShieldCheck weight="bold" className="w-4 h-4 text-emerald-400" />
                <span>Keycloak Identity Server Info</span>
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px] text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Keycloak Host:</span>
                <span>http://localhost:8280</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Realm Name:</span>
                <span className="text-cyan-400 font-semibold">markie</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-500">Client ID:</span>
                <span className="text-amber-300">markie_app</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Grant Types:</span>
                <span className="text-emerald-400">password, client_credentials</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            Đóng & Áp dụng
          </button>
        </div>

      </div>
    </div>
  );
};
