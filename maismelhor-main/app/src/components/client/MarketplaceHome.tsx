import * as React from 'react';
import { motion } from 'framer-motion';
import { pageStagger, springScaleIn } from '../../lib/motion/variants';
import CategoryGrid from './CategoryGrid';
import HeroRecommendations from './HeroRecommendations';
import LocalPromotionsList from './LocalPromotionsList';
import FeaturedStoresList from './FeaturedStoresList';

export default function MarketplaceHome() {
  return (
    <motion.div 
      className="flex flex-col w-full bg-neutral-50 dark:bg-neutral-950 pb-8 overflow-x-hidden"
      variants={pageStagger}
      initial="hidden"
      animate="visible"
    >
      
      {/* 1. Smart Hero Recommendations (Para Você) */}
      <motion.div variants={springScaleIn}>
        <HeroRecommendations />
      </motion.div>

      {/* 2. Categories Grid (Discovery) */}
      <motion.div variants={springScaleIn}>
        <CategoryGrid />
      </motion.div>

      {/* 3. Local Highlights & Deals */}
      <motion.div variants={springScaleIn}>
        <LocalPromotionsList />
      </motion.div>

      {/* 4. Nearby Highly Rated Stores (Airbnb Style Cards) */}
      <motion.div variants={springScaleIn}>
        <FeaturedStoresList title="Lojas Populares Perto de Você" />
      </motion.div>

      {/* 5. Interactive City Hub Map Preview */}
      <motion.div variants={springScaleIn} className="px-4 mb-2 relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-neutral-900 dark:text-neutral-50">Olhe as lojas na sua região</h2>
        </div>
        <a 
          href="/client/mapa"
          className="block w-full relative h-32 rounded-3xl overflow-hidden group shadow-md"
        >
          <div className="absolute inset-0 bg-[url('https://maps.wikimedia.org/osm-intl/13/2986/4665.png')] bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-4">
            <div className="bg-white text-neutral-900 font-bold px-5 py-2.5 rounded-full flex items-center space-x-2 shadow-lg group-hover:scale-105 transition-transform active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
              <span>Ver Mapa da Cidade</span>
            </div>
          </div>
        </a>
      </motion.div>

      {/* 6. Fresh / New Offerings */}
      <motion.div variants={springScaleIn}>
        <FeaturedStoresList title="Novidades na Região" />
      </motion.div>

    </motion.div>
  );
}
