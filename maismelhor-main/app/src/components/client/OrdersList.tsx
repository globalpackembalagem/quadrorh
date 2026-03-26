import * as React from 'react';
import { Package, MoreHorizontal, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, slideFromBottom } from '../../lib/motion/variants';

const MOCK_ORDERS = [
  {
    id: '1284',
    vendor: 'Smash Burguer',
    date: 'Hoje, 20:45',
    status: 'preparing', // pending, confirmed, preparing, delivering, done, cancelled
    items: '1x X-Bacon Cheddar Master, 1x Coca-Cola',
    total: 42.90
  },
  {
    id: '1283',
    vendor: 'Tokyo Japa',
    date: 'Ontem, 19:30',
    status: 'done',
    items: '1x Combo Sushi 40 Peças',
    total: 89.90
  },
  {
    id: '1270',
    vendor: 'Pizzaria Napoli',
    date: '10 de Fev, 21:00',
    status: 'done',
    items: '1x Pizza Calabresa GG, 1x Guaraná 2L',
    total: 65.00
  }
];

const statusStyles: Record<string, { label: string, color: string }> = {
  preparing: { label: 'Preparando', color: 'bg-info text-white' },
  delivering: { label: 'Saiu p/ Entrega', color: 'bg-brand-500 text-white' },
  done: { label: 'Concluído', color: 'bg-success/10 text-success dark:bg-success/20 dark:text-success' },
  cancelled: { label: 'Cancelado', color: 'bg-error/10 text-error' }
};

export default function OrdersList() {
  return (
    <div className="py-6 px-4 animate-fade-in w-full">
      <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-neutral-50 mb-6">Meus Pedidos</h1>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {MOCK_ORDERS.map((order) => {
          const status = statusStyles[order.status];
          
          return (
            <motion.div 
              key={order.id}
              variants={slideFromBottom}
              className="glass-1 p-4 rounded-3xl"
            >
              <div className="flex items-start justify-between mb-3 border-b border-neutral-200/50 dark:border-neutral-800/50 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                    <Package className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{order.vendor}</span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">{order.date} • #{order.id}</span>
                  </div>
                </div>
                <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.color}`}>
                  {status.label}
                </div>
              </div>

              <div className="flex flex-col mb-4">
                <span className="text-sm text-neutral-600 dark:text-neutral-300 font-medium mb-1 line-clamp-1">
                  {order.items}
                </span>
                <span className="font-bold text-brand-500">
                  R$ {order.total.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button className="flex-1 bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 font-bold text-xs py-2.5 rounded-xl hover:bg-brand-500/20 transition-colors">
                  Ajudar c/ Pedido
                </button>
                <button className="flex-1 border border-neutral-200 dark:border-neutral-700 font-bold text-xs text-neutral-700 dark:text-neutral-300 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  Ver Detalhes
                </button>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  );
}
