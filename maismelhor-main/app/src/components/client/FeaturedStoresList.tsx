import * as React from 'react';
// Force Vite HMR Cache Invalidation
import { Star, MapPin } from 'lucide-react';
import { AnimatedCard } from '../ui/AnimatedCard';
import { motion } from 'framer-motion';
import { staggerContainer } from '../../lib/motion/variants';

const FEATURED_STORES = [
  {
    id: '0',
    name: '',
    category: '',
    rating: 0,
    distance: '',
    image: '',
    deliveryTime: '',
    deliveryFee: ''
  },
  {
    id: '1',
    name: 'Pizzaria Bella Massa',
    category: 'Restaurante',
    rating: 4.8,
    distance: '1.2km',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
    deliveryTime: '30-45 min',
    deliveryFee: 'Grátis'
  },
  {
    id: '2',
    name: 'Farmácia Vida & Saúde',
    category: 'Saúde',
    rating: 4.9,
    distance: '0.8km',
    image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=300&q=80',
    deliveryTime: '15-25 min',
    deliveryFee: 'R$ 4,90'
  },
  {
    id: '3',
    name: 'Mercado Central',
    category: 'Mercado',
    rating: 4.7,
    distance: '2.5km',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=300&q=80',
    deliveryTime: 'Hoje',
    deliveryFee: 'R$ 7,90'
  },
];

interface Props {
  title: string;
}

export default function FeaturedStoresList({ title }: Props) {
  return (
    <div className="py-4">
      <div className="px-4 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-neutral-900 dark:text-neutral-50">{title}</h2>
        <button className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">Ver todos</button>
      </div>

      <motion.div 
        variants={staggerContainer} 
        className="flex overflow-x-auto snap-x snap-mandatory px-2 pb-6 space-x-2 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >

        {FEATURED_STORES.map((store, i) => {
          if (i === 0) {
            return <div key={store.id} className="w-2 flex-shrink-0 snap-start" aria-hidden="true" />;
          }

          return (
            <AnimatedCard
              key={store.id}
              interactive
              className="flex-shrink-0 snap-start w-64 p-0 group bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 shadow-sm"
            >
              {/* Store Image Header */}
              <div className="relative w-full h-32 overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={store.image}
                  alt={store.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1 shadow-sm">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200">{store.rating}</span>
                </div>
              </div>

              {/* Store Info */}
              <div className="p-3 flex flex-col">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wide mb-1">
                  {store.category}
                </span>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 leading-tight mb-2 truncate group-hover:text-brand-500 transition-colors">
                  {store.name}
                </h3>

                <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 space-x-3 mb-3 font-medium">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{store.distance}</span>
                  </span>
                  <span>•</span>
                  <span>{store.deliveryTime}</span>
                </div>

                <div className="w-full pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-success dark:text-success/90">
                    {store.deliveryFee}
                  </span>
                  <button className="text-[10px] font-bold text-brand-500 hover:text-brand-600 transition-colors bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/30 px-3 py-1.5 rounded-lg active:scale-95">
                    Ver Loja
                  </button>
                </div>
              </div>
            </AnimatedCard>
          );
        })}
        {/* Invisible right-end spacer so last item doesn't stick to the screen edge */}
        <div className="w-1 flex-shrink-0 opacity-0 relative -ml-2" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
