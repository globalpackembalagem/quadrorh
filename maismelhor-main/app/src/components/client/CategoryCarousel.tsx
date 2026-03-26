import * as React from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, slideFromRight } from '../../lib/motion/variants';

const CATEGORIES = [
  { id: '1', name: 'Lanches', icon: '🍔', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { id: '2', name: 'Pizzas', icon: '🍕', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  { id: '3', name: 'Japonesa', icon: '🍣', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  { id: '4', name: 'Açaí', icon: '🫐', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  { id: '5', name: 'Bebidas', icon: '🥤', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: '6', name: 'Mercado', icon: '🛒', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
];

export default function CategoryCarousel() {
  return (
    <div className="py-6">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold dark:text-neutral-50">Categorias</h2>
      </div>
      
      {/* 
        Netflix-style Carousel
        snap-x snap-mandatory for smooth snapping 
        no-scrollbar defined in global css
      */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex overflow-x-auto snap-x snap-mandatory px-4 pb-4 space-x-4 no-scrollbar"
      >
        {CATEGORIES.map((cat, index) => (
          <motion.button
            key={cat.id}
            variants={slideFromRight}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center flex-shrink-0 snap-start space-y-2 group focus:outline-none"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${cat.color}`}>
              {cat.icon}
            </div>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {cat.name}
            </span>
          </motion.button>
        ))}
        {/* Spacer to allow the last item to be centered/scrolled past */}
        <div className="w-1 flex-shrink-0" />
      </motion.div>
    </div>
  );
}
