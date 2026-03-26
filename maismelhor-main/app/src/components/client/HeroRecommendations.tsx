import * as React from 'react';
import { motion } from 'framer-motion';
import { Flame, Star, MapPin, Eye, TrendingUp } from 'lucide-react';
import { AnimatedCard } from '../ui/AnimatedCard';
import { staggerContainer } from '../../lib/motion/variants';

const RECOMMENDATIONS = [
  {
    id: 'rec1',
    type: 'PROMO',
    title: 'Pizza Bella Massa',
    highlight: '30% OFF Hoje',
    context: 'Você pediu pizza na última sexta',
    socialProof: '12 pessoas vendo agora',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
    color: 'from-brand-500/90 to-brand-600/90',
    icon: <Flame className="w-4 h-4 text-white" />
  },
  {
    id: 'rec2',
    type: 'TOP',
    title: 'Padaria Central',
    highlight: 'Mais bem avaliado (4.9⭐)',
    context: 'Líder em cafés da manhã',
    socialProof: '3 pedidos nos últimos 10 min',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    color: 'from-amber-500/90 to-amber-600/90',
    icon: <Star className="w-4 h-4 text-white" />
  },
  {
    id: 'rec3',
    type: 'NEARBY',
    title: 'Farmácia Vida',
    highlight: 'A apenas 400m',
    context: 'Entrega rápida disponível',
    socialProof: 'Nova na plataforma',
    image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=400&q=80',
    color: 'from-blue-500/90 to-blue-600/90',
    icon: <MapPin className="w-4 h-4 text-white" />
  }
];

export default function HeroRecommendations() {
  return (
    <div className="pt-2 pb-6">
      <div className="px-4 mb-4 flex items-end justify-between">
        <div>
          <span className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-1 block">Para você</span>
          <h2 className="text-2xl font-display font-black text-neutral-900 dark:text-white leading-none">
            Ribeirão Branco
          </h2>
        </div>
      </div>

      <motion.div 
        variants={staggerContainer}
        className="flex overflow-x-auto snap-x snap-mandatory px-4 pb-4 space-x-4 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {RECOMMENDATIONS.map((item, i) => (
          <AnimatedCard
            key={item.id}
            interactive
            className={`flex-shrink-0 snap-center w-72 h-44 rounded-3xl p-0 overflow-hidden group shadow-lg border border-white/10`}
          >
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${item.color} mix-blend-multiply`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>

            {/* Content Foreground */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between z-10 text-white">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 backdrop-blur-md rounded-full p-2">
                  {item.icon}
                </div>
                {i === 0 && (
                  <div className="bg-white text-neutral-900 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full flex items-center shadow-sm">
                    <TrendingUp className="w-3 h-3 mr-1 text-brand-500" />
                    Em alta
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider block mb-0.5">
                  {item.context}
                </span>
                <h3 className="text-xl font-display font-bold leading-none mb-1 shadow-sm">
                  {item.title}
                </h3>
                <p className="font-bold text-brand-300 text-sm mb-3">
                  {item.highlight}
                </p>
                
                {/* Social Proof Bar */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-2 flex items-center space-x-2 border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                    <Eye className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-white/90">
                    {item.socialProof}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedCard>
        ))}
        {/* Invisible right-end spacer */}
        <div className="w-1 flex-shrink-0 opacity-0 relative -ml-4" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
