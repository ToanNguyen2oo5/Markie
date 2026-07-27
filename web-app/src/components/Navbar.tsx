import React from 'react';
import { Users, GlobeHemisphereWest } from '@phosphor-icons/react';

interface NavbarProps {
  serverConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  serverConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-[1px] shadow-lg shadow-blue-500/10">
            <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
              <Users weight="bold" className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Markie</span>
              <span className="text-[10px] uppercase tracking-wider font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Social
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">Kết nối đam mê</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center space-x-3">
          {/* Connection Status Pill */}
          <div
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 transition-all"
          >
            <GlobeHemisphereWest weight="fill" className={`w-4 h-4 ${serverConnected ? 'text-emerald-400' : 'text-amber-500'}`} />
            <span className="font-medium text-xs">
              {serverConnected ? 'Đã kết nối máy chủ' : 'Đang kết nối...'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};

