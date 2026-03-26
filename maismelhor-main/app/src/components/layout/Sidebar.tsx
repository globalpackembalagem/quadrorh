'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Store,
  ShoppingBag,
  Tag,
  Truck,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
}

const navItems = [
  { id: 'home',      label: 'Home',         icon: LayoutDashboard, href: '/dashboard' },
  { id: 'produtos',  label: 'Produtos',     icon: Package,         href: '/dashboard/produtos' },
  { id: 'loja',      label: 'Minha Loja',   icon: Store,           href: '/dashboard/loja' },
  { id: 'pedidos',   label: 'Pedidos',      icon: ShoppingBag,     href: '/dashboard/pedidos',  badge: '12' },
  { id: 'promocoes', label: 'Promoções',    icon: Tag,             href: '/dashboard/promocoes' },
  { id: 'entregas',  label: 'Entregas',     icon: Truck,           href: '/dashboard/entregas', badge: '3' },
];

export default function Sidebar({ activeSection }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} // smooth, non-bouncy easing
      className="glass-3 flex flex-col border-r border-white/[0.06] relative z-20 flex-shrink-0"
    >
      {/* 
        This is the inner container that handles the overflow-hidden
        so the text doesn't wrap/spill when shrinking.
        Notice that the collapse toggle button is OUTSIDE this div! 
      */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {/* Header / Logo */}
        <div className="flex-shrink-0 flex items-center h-[80px] px-5 border-b border-white/[0.06]">
          <motion.div
            layout
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30"
          >
            <img src="/logo.svg" alt="Logo" className="w-[22px] h-[22px] object-contain drop-shadow-md" />
          </motion.div>

          {/* Text block */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 130, marginLeft: 12 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden whitespace-nowrap flex-shrink-0"
              >
                <div className="w-[130px]">
                  <p className="text-[15px] font-bold text-white font-display leading-tight truncate">
                    Mais Melhor
                  </p>
                  <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate">
                    Dashboard Admin
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <a key={item.id} href={item.href} className="block no-underline flex-shrink-0">
                <motion.div
                  layout
                  className={`relative flex items-center h-[46px] rounded-xl cursor-pointer group hover:bg-white/[0.04] transition-colors ${
                    isActive ? 'bg-brand-500/10' : ''
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand-500 rounded-r-full"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}

                  {/* Icon wrapper - fixed width so it stays perfectly aligned */}
                  <div className={`w-[48px] flex items-center justify-center flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-neutral-400 group-hover:text-neutral-300 transition-colors'}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Label */}
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 140 }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden whitespace-nowrap flex-shrink-0"
                      >
                        <div className="flex items-center justify-between w-[140px] pr-3">
                          <span className={`text-[13px] font-medium truncate ${isActive ? 'text-brand-400' : 'text-neutral-300'}`}>
                            {item.label}
                          </span>
                          
                          {item.badge && (
                            <span className="px-1.5 py-0.5 bg-brand-500/20 text-brand-400 text-[10px] font-bold rounded-full border border-brand-500/20 leading-none">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Badge when collapsed (shows up as a small dot/number attached to the icon) */}
                  <AnimatePresence>
                    {collapsed && item.badge && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-[#131211] shadow-sm pointer-events-none"
                      >
                        {item.badge}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </a>
            );
          })}
        </nav>

        {/* Profile section */}
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <a href="/dashboard/perfil" className="block no-underline">
            <motion.div
              layout
              className="flex items-center h-[52px] rounded-xl cursor-pointer overflow-hidden relative group hover:bg-white/[0.06] transition-colors"
              title={collapsed ? 'Meu Perfil' : undefined}
            >
              <div className="w-[48px] flex items-center justify-center flex-shrink-0 relative">
                <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-md">
                  <User className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="absolute bottom-1 right-[3px] w-3 h-3 bg-success rounded-full border-[2.5px] border-[#131211]" />
              </div>

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{ opacity: 1, width: 140, marginLeft: 8 }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden whitespace-nowrap flex-shrink-0"
                  >
                    <div className="w-[140px] pr-3">
                      <p className="text-[13px] font-semibold text-neutral-100 leading-tight truncate">Carlos Admin</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Crown className="w-[10px] h-[10px] text-brand-400 flex-shrink-0" />
                        <p className="text-[11px] text-brand-400 font-medium truncate">Plano Pro</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </a>
        </div>
      </div>

      {/* 
        Collapse toggle button - OUTSIDE the overflow-hidden wrapper!
        This guarantees it never gets clipped, and we stick it directly to the right border.
      */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-7 -right-[14px] w-[28px] h-[28px] glass-1 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer shadow-xl shadow-black/40 z-50 bg-[#1A1918]"
        aria-label={collapsed ? 'Expandir' : 'Recolher'}
      >
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <ChevronLeft className="w-[14px] h-[14px]" />
        </motion.div>
      </button>
    </motion.aside>
  );
}
