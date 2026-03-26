'use client';
import React from 'react';
import { Bell, Search } from 'lucide-react';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="glass-3 border-b border-white/[0.06] px-6 py-3.5 flex items-center justify-between gap-4 z-10">
      {/* Page title */}
      <h1 className="text-lg font-semibold font-display text-neutral-100">{title}</h1>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-48 h-9 pl-9 pr-4 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-sm text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-brand-500/50 focus:w-64 transition-all duration-300"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 glass-1 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors" aria-label="Notificações">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full border border-neutral-900" />
        </button>

        {/* Current date */}
        <span className="text-xs text-neutral-500 hidden lg:block whitespace-nowrap">
          Qua, 11 Mar 2026
        </span>
      </div>
    </header>
  );
}
