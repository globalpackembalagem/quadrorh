import * as React from 'react';
import { ShoppingBag, Pill, Wrench, Gift, Coffee, Scissors, Car, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInScale } from '../../lib/motion/variants';

const CATEGORIES = [
  { id: '1', name: 'Restaurantes', icon: Coffee, color: 'bg-orange-100 text-brand-500' },
  { id: '2', name: 'Mercado', icon: ShoppingBag, color: 'bg-blue-100 text-blue-500' },
  { id: '3', name: 'Farmácia', icon: Pill, color: 'bg-green-100 text-green-500' },
  { id: '4', name: 'Serviços', icon: Wrench, color: 'bg-slate-100 text-slate-500' },
  { id: '5', name: 'Presentes', icon: Gift, color: 'bg-pink-100 text-pink-500' },
  { id: '6', name: 'Beleza', icon: Scissors, color: 'bg-purple-100 text-purple-500' },
  { id: '7', name: 'Automotivo', icon: Car, color: 'bg-zinc-100 text-zinc-500' },
  { id: '8', name: 'Lojas', icon: Store, color: 'bg-teal-100 text-teal-500' },
];

export default function CategoryGrid() {
  return (
    <div className="py-6 px-4">
      <motion.div 
        variants={staggerContainer}
        className="grid grid-cols-4 gap-y-6 gap-x-2"
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <motion.a
              key={cat.id}
              href={`#${cat.name.toLowerCase()}`}
              variants={fadeInScale}
              whileTap={{ scale: 0.92 }}
              className="flex flex-col items-center group focus:outline-none"
            >
              <div 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-sm transition-transform duration-200 group-hover:scale-105 ${cat.color} dark:bg-opacity-20`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 text-center tracking-tight">
                {cat.name}
              </span>
            </motion.a>
          );
        })}
      </motion.div>
    </div>
  );
}
