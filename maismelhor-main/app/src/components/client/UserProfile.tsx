import * as React from 'react';
import { Settings, MapPin, CreditCard, Heart, HelpCircle, ChevronRight, LogOut, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, slideFromBottom } from '../../lib/motion/variants';

const SECTIONS = [
  {
    title: 'Minha Conta',
    items: [
      { id: 'orders', label: 'Meus Pedidos', icon: Package, href: '/client/pedidos' },
      { id: 'favorites', label: 'Favoritos', icon: Heart, href: '#' },
      { id: 'addresses', label: 'Endereços', icon: MapPin, href: '#' },
      { id: 'payments', label: 'Pagamentos', icon: CreditCard, href: '#' },
    ]
  },
  {
    title: 'Geral',
    items: [
      { id: 'settings', label: 'Configurações', icon: Settings, href: '#' },
      { id: 'help', label: 'Ajuda e Suporte', icon: HelpCircle, href: '#' },
    ]
  }
];

export default function UserProfile() {
  return (
    <div className="pb-10 pt-4 px-4 w-full animate-fade-in">
      
      {/* User Header */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-brand-500 border-4 border-white dark:border-neutral-900 shadow-xl overflow-hidden relative">
          <img src="https://i.pravatar.cc/300?img=68" alt="User Profile" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-neutral-50 mb-1">
            João Silva
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">joao.silva@email.com</p>
          <button className="text-xs text-brand-500 font-bold uppercase mt-2 w-max hover:text-brand-600 transition-colors">
            Editar Perfil
          </button>
        </div>
      </div>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3 px-2">
              {section.title}
            </h3>
            <div className="glass-2 rounded-3xl overflow-hidden divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.a
                    key={item.id}
                    href={item.href}
                    variants={slideFromBottom}
                    className="flex items-center justify-between p-4 bg-white/40 dark:bg-neutral-900/40 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60 transition-colors active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400" />
                  </motion.a>
                )
              })}
            </div>
          </div>
        ))}
        
        {/* Logout Button */}
        <motion.button 
          variants={slideFromBottom}
          className="flex items-center justify-center w-full p-4 space-x-2 text-error font-semibold mt-4 bg-error/10 dark:bg-error/5 hover:bg-error/20 dark:hover:bg-error/15 rounded-2xl transition-colors active:scale-95 duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair do App</span>
        </motion.button>
        
      </motion.div>
    </div>
  );
}
