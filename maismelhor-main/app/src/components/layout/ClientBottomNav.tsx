import * as React from 'react';
import { Home, PlaySquare, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  activePath: string;
}

export default function ClientBottomNav({ activePath }: Props) {
  const tabs = [
    { id: 'home', label: 'Início', icon: Home, href: '/client' },
    { id: 'promocoes', label: 'Promo', icon: PlaySquare, href: '/client/promocoes' },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, href: '/client/pedidos' },
    { id: 'perfil', label: 'Perfil', icon: User, href: '/client/perfil' },
  ];

  // Remove trailing slashes for safer match
  const currentPath = activePath.replace(/\/$/, '') || '/client';

  return (
    <div className="fixed bottom-0 w-full max-w-md mx-auto z-50 glass-3 border-t border-neutral-200/20 dark:border-neutral-800/20 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-[70px] px-2">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.href;
          const Icon = tab.icon;

          return (
            <a
              key={tab.id}
              href={tab.href}
              className="relative flex flex-col items-center justify-center w-full h-full space-y-1"
            >
              <div className="relative flex items-center justify-center w-10 h-10">
                <Icon
                  className={`w-6 h-6 z-10 transition-colors duration-300 ${
                    isActive
                      ? 'text-brand-500'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-brand-500/15 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${
                  isActive
                    ? 'text-brand-500'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {tab.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
