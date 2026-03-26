import * as React from 'react';
import { Star } from 'lucide-react';
import { AnimatedCard } from '../ui/AnimatedCard';

const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'X-Bacon Cheddar Master',
    vendor: 'Smash Burguer',
    price: 34.90,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
    time: '30-45 min'
  },
  {
    id: '2',
    name: 'Combo Sushi 40 Peças',
    vendor: 'Tokyo Delivery',
    price: 89.90,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80',
    time: '40-55 min'
  },
  {
    id: '3',
    name: 'Pizza Calabresa GG',
    vendor: 'Pizzaria Napoli',
    price: 55.00,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
    time: '50-60 min'
  },
];

interface Props {
  title: string;
}

export default function ProductHorizontalList({ title }: Props) {
  return (
    <div className="py-4">
      <div className="px-4 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold dark:text-neutral-50">{title}</h2>
        <button className="text-xs font-semibold text-brand-500">Ver mais</button>
      </div>
      
      <div className="flex overflow-x-auto snap-x snap-mandatory px-4 pb-6 space-x-4 no-scrollbar">
        {MOCK_PRODUCTS.map((product, i) => (
          <AnimatedCard 
            key={product.id}
            interactive
            delay={i * 0.1}
            className="flex-shrink-0 snap-start w-64 p-3 group"
          >
            <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute top-2 right-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1 shadow-sm">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200">{product.rating}</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">{product.vendor}</span>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 leading-tight my-1 truncate">
                {product.name}
              </h3>
              
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {product.time}
                </span>
              </div>
            </div>
          </AnimatedCard>
        ))}
        {/* Invisible right-end spacer */}
        <div className="w-1 flex-shrink-0 opacity-0 relative -ml-2" aria-hidden="true" />
      </div>
    </div>
  );
}
