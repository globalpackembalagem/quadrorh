import * as React from 'react';
import { Heart, Share2, MoreVertical, ShoppingBag, Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const PROMO_VIDEOS = [
  {
    id: '1',
    vendor: 'Smash Burguer',
    title: 'X-Bacon Cheddar Master',
    description: 'Aquele queijo derretido no ponto perfeito. Peça agora com 30% OFF!',
    price: 34.90,
    videoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80', // In a real app we'd use mp4/webm. For now, a high quality immersive image works to simulate the visual layout.
    likes: '12K',
    comments: '342'
  },
  {
    id: '2',
    vendor: 'Pizzaria Napoli',
    title: 'Festival da Calabresa',
    description: 'Pizza grande + Refri por R$ 55,00. Só hoje!',
    price: 55.00,
    videoUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
    likes: '8.5K',
    comments: '124'
  },
  {
    id: '3',
    vendor: 'Tokyo Japa',
    title: 'Barco 40 Peças Promo',
    description: 'Ingredientes frescos todo dia. Frete grátis pra você.',
    price: 89.90,
    videoUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=600&q=80',
    likes: '22K',
    comments: '1.2K'
  }
];

export default function PromotionsFeed() {
  return (
    <div className="relative w-full h-[100dvh] bg-black">

      {/* Floating Glass Search Header */}
      <div className="absolute top-0 inset-x-0 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 px-4 z-20 pointer-events-none flex justify-center">
        <div className="w-full max-w-md pointer-events-auto">
          <div className="relative group">

            <input
              type="text"
              placeholder="Pesquisar promoções..."
              className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-full py-3 pl-6 pr-14 text-white text-sm font-bold placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xl transition-all"
            />
            <button className="absolute inset-y-0 right-0 px-6 flex items-center text-white/70 hover:text-white transition-colors active:scale-95" aria-label="Filtrar promoções">
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll no-scrollbar">
        {PROMO_VIDEOS.map((promo) => (
          <div key={promo.id} className="relative w-full h-full snap-start snap-always bg-neutral-900 overflow-hidden">

            {/* Background Image/Video Simulator */}
            <div className="absolute inset-0">
              <img
                src={promo.videoUrl}
                alt={promo.title}
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Side Interaction Icons */}
            <div className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+120px)] flex flex-col items-center space-y-6 z-10">
              <button className="flex flex-col items-center group">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white mb-1 transition-transform group-hover:scale-110 active:scale-90">
                  <Heart className="w-6 h-6 fill-transparent hover:fill-brand-500 hover:text-brand-500 transition-colors" />
                </div>
                <span className="text-white text-xs font-semibold shadow-black drop-shadow-md">{promo.likes}</span>
              </button>
              <button className="flex flex-col items-center group">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white mb-1 transition-transform group-hover:scale-110 active:scale-90">
                  <Share2 className="w-6 h-6" />
                </div>
                <span className="text-white text-xs font-semibold shadow-black drop-shadow-md">Share</span>
              </button>
              <button className="flex flex-col items-center group">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white transition-transform group-hover:scale-110 active:scale-90">
                  <MoreVertical className="w-6 h-6" />
                </div>
              </button>
            </div>

            {/* Bottom Info Section */}
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+90px)] left-4 right-20 z-10">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center overflow-hidden border border-white/20">
                  <span className="text-white font-bold text-xs uppercase">{promo.vendor.substring(0, 2)}</span>
                </div>
                <span className="text-white font-bold text-sm drop-shadow-md">{promo.vendor}</span>
                <button className="px-2 py-0.5 border border-white/40 text-white rounded-md text-[10px] font-bold uppercase backdrop-blur-md">Seguir</button>
              </div>

              <h2 className="text-white font-display font-bold text-lg leading-tight mb-1 drop-shadow-lg">{promo.title}</h2>
              <p className="text-neutral-200 text-sm line-clamp-2 mb-4 drop-shadow-md">{promo.description}</p>

              <motion.button
                whileTap={{ scale: 0.96 }}
                className="flex items-center space-x-2 bg-brand-500 text-white px-5 py-3 rounded-full font-bold shadow-lg shadow-brand-500/50"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Pedir por R$ {promo.price.toFixed(2).replace('.', ',')}</span>
              </motion.button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
