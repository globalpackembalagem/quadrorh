import * as React from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInScale, staggerContainer } from '../../lib/motion/variants';

const PROMOTIONS = [
  { id: '1', store: 'Pizzaria Bella Massa', deal: '50% OFF', description: 'Em toda linha clássica', color: 'from-brand-500 to-brand-600' },
  { id: '2', store: 'Mercado Central', deal: 'Frete Grátis', description: 'Compras acima de R$ 50', color: 'from-blue-500 to-blue-600' },
  { id: '3', store: 'Farmácia Vida & Saúde', deal: 'Leve 3, Pague 2', description: 'Suplementos vitais', color: 'from-emerald-500 to-emerald-600' },
];

export default function LocalPromotionsList() {
  return (
    <div className="py-2 px-4 mb-6">
      
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-error fill-error" />
        </div>
        <h2 className="text-lg font-display font-bold text-neutral-900 dark:text-neutral-50">Ofertas da Cidade</h2>
      </div>

      <motion.div variants={staggerContainer} className="flex flex-col space-y-3">
        {PROMOTIONS.map((promo, i) => (
          <motion.button
            key={promo.id}
            variants={fadeInScale}
            whileTap={{ scale: 0.98 }}
            className={`w-full relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r ${promo.color} text-white shadow-lg active:scale-95 focus:outline-none flex justify-between items-center group`}
          >
            {/* Background Pattern Elements */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col items-start text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1">{promo.store}</span>
              <h3 className="text-xl font-display font-bold leading-tight drop-shadow-sm">{promo.deal}</h3>
              <p className="text-xs font-medium text-white/90 mt-0.5">{promo.description}</p>
            </div>

            <div className="relative z-10 bg-white text-neutral-900 font-bold text-[10px] px-3 py-2 rounded-xl group-hover:bg-neutral-50 transition-colors shadow-sm uppercase tracking-wider">
              Aproveitar
            </div>
          </motion.button>
        ))}
      </motion.div>

    </div>
  );
}
