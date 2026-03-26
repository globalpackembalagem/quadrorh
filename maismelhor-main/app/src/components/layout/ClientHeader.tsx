import * as React from 'react';
import { MapPin, Search, ChevronDown, Bell } from 'lucide-react';

export default function ClientHeader() {
  return (
    <div className="bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 shadow-sm">
      
      {/* Location Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Brand Logo */}
          <div className="flex items-center">
            <img src="/logo.svg" alt="Mais Melhor Logo" className="h-8 w-auto object-contain" />
          </div>

          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800"></div>

          {/* Location Dropdown */}
          <button className="flex flex-col text-left group active:scale-95 transition-transform">
            <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest leading-none mb-0.5 flex items-center">
              <MapPin className="w-2.5 h-2.5 mr-1 text-brand-500" />
              Entregar em
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-display font-bold text-neutral-900 dark:text-neutral-50 leading-tight">
                Ribeirão Branco
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-brand-500 transition-colors" />
            </div>
          </button>
        </div>

        <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors active:scale-95">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-500 rounded-full border border-white dark:border-neutral-950" />
        </button>
      </div>

      {/* Hero Search */}
      <div className="relative mb-3 group">
        <label htmlFor="hero-search" className="sr-only">O que você procura?</label>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-brand-500" />
        </div>
        <input 
          id="hero-search"
          type="text" 
          placeholder="Buscar lojas, serviços ou produtos" 
          className="w-full bg-neutral-100 dark:bg-neutral-900 border-none rounded-2xl py-3.5 pl-12 pr-4 text-neutral-900 dark:text-neutral-50 text-sm font-medium placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-inner transition-all"
        />
      </div>

    </div>
  );
}
