import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Star, MapPin, Clock, Truck, Phone, Share2,
  Heart, ShoppingBag, Tag, ChevronRight, BadgeCheck
} from 'lucide-react';
import { getStoreBySlug, type Store } from '../../lib/stores';
import { staggerContainer, fadeInScale, fadeIn } from '../../lib/motion/variants';

interface Props {
  slug: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Restaurante': '🍕',
  'Saúde & Bem-estar': '💊',
  'Mercado & Hortifruti': '🛒',
  'Café & Confeitaria': '☕',
};

function StatPill({ icon, label, value, accent = false }: { icon: React.ReactNode; label?: string; value: string; accent?: boolean }) {
  return (
    <div
      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: accent ? 'rgba(255,107,0,0.12)' : 'rgba(255,255,255,0.06)',
        border: accent ? '1px solid rgba(255,107,0,0.25)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span className={accent ? 'text-brand-400' : 'text-neutral-400'}>{icon}</span>
      <span className={`text-xs font-semibold ${accent ? 'text-brand-300' : 'text-neutral-300'}`}>{value}</span>
    </div>
  );
}

function ProductCard({ product, index }: { product: Store['products'][0]; index: number }) {
  const [added, setAdded] = React.useState(false);

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <motion.div
      variants={fadeInScale}
      className="rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Product image */}
      <div className="relative w-full h-28 overflow-hidden bg-neutral-800">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/50 to-transparent" />
        <div className="absolute top-2 left-2">
          <span
            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,107,0,0.85)', color: 'white' }}
          >
            {product.category}
          </span>
        </div>
      </div>

      {/* Product info */}
      <div className="p-3">
        <h4 className="text-xs font-bold text-neutral-100 leading-tight mb-1 truncate group-hover:text-brand-300 transition-colors">
          {product.name}
        </h4>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-brand-400">{product.price}</span>
          <motion.button
            onClick={handleAdd}
            whileTap={{ scale: 0.88 }}
            className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: added ? 'rgba(34,197,94,0.2)' : 'rgba(255,107,0,0.15)',
              border: added ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,107,0,0.3)',
            }}
          >
            {added
              ? <BadgeCheck className="w-3.5 h-3.5 text-success" />
              : <ShoppingBag className="w-3.5 h-3.5 text-brand-400" />
            }
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function StoreDetailPage({ slug }: Props) {
  const store = getStoreBySlug(slug);
  const [liked, setLiked] = React.useState(false);

  if (!store) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'radial-gradient(ellipse at top, #1a0f00 0%, #0A0908 60%, #050403 100%)' }}
      >
        <div
          className="rounded-3xl p-8 max-w-xs w-full"
          style={{
            background: 'rgba(20,18,16,0.8)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div className="text-4xl mb-4">🏪</div>
          <h2 className="text-lg font-display font-bold text-neutral-100 mb-2">Loja não encontrada</h2>
          <p className="text-sm text-neutral-400 mb-6">O endereço que você acessou não corresponde a nenhuma loja.</p>
          <a href="/client/mapa" className="btn-primary w-full justify-center">
            <ChevronLeft className="w-4 h-4" />
            Voltar ao Mapa
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at top left, #1a0f00 0%, #0A0908 50%, #050403 100%)' }}
    >
      {/* ── HERO ── */}
      <div className="relative w-full h-72 overflow-hidden flex-shrink-0">
        <img
          src={store.coverImage}
          alt={store.name}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/50 via-neutral-950/20 to-neutral-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/30 to-transparent" />

        {/* Floating top bar */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between">
          <motion.a
            href="/client/mapa"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-neutral-100 active:scale-95 transition-all"
            style={{
              background: 'rgba(10,9,8,0.6)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.a>
          <div className="flex items-center space-x-2">
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
              onClick={() => setLiked(l => !l)}
              whileTap={{ scale: 0.85 }}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
              style={{
                background: liked ? 'rgba(239,68,68,0.2)' : 'rgba(10,9,8,0.6)',
                backdropFilter: 'blur(16px)',
                border: liked ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Heart className={`w-4 h-4 transition-colors ${liked ? 'text-red-400 fill-red-400' : 'text-neutral-200'}`} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.14 }}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-neutral-200 active:scale-95 transition-all"
              style={{
                background: 'rgba(10,9,8,0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Hero bottom info */}
        <div className="absolute bottom-0 inset-x-0 p-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {store.deal && (
              <div className="inline-flex items-center space-x-1 mb-2">
                <Tag className="w-3 h-3 text-brand-400" />
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,107,0,0.25)', color: '#FFB06B', border: '1px solid rgba(255,107,0,0.3)' }}
                >
                  {store.deal}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1.5 mb-1">
              <span className="text-2xl">{CATEGORY_ICONS[store.category] ?? '🏪'}</span>
              <span className="text-xs text-neutral-400 font-semibold">{store.category}</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-white leading-tight">
              {store.name}
            </h1>
          </motion.div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 -mt-4 rounded-t-3xl relative z-10" style={{ background: 'transparent' }}>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="px-4 pt-5 pb-4 flex items-center flex-wrap gap-2"
        >
          <StatPill
            icon={<Star className="w-3 h-3 fill-warning" />}
            value={`${store.rating} (${store.reviews})`}
            accent
          />
          <StatPill icon={<Clock className="w-3 h-3" />} value={store.deliveryTime} />
          <StatPill icon={<Truck className="w-3 h-3" />} value={store.deliveryFee} />
          <StatPill icon={<MapPin className="w-3 h-3" />} value={store.distance} />
        </motion.div>

        {/* Divider */}
        <div className="h-px mx-4 mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Description */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="px-4 mb-5"
        >
          <p className="text-sm text-neutral-400 leading-relaxed">{store.description}</p>
        </motion.div>

        {/* Info cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="px-4 mb-6 space-y-2"
        >
          {[
            { icon: <MapPin className="w-4 h-4 text-brand-400" />, label: 'Endereço', value: store.address },
            { icon: <Clock className="w-4 h-4 text-brand-400" />, label: 'Horários', value: store.hours },
            { icon: <Phone className="w-4 h-4 text-brand-400" />, label: 'Telefone', value: store.phone },
          ].map(({ icon, label, value }) => (
            <motion.div
              key={label}
              variants={fadeInScale}
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,107,0,0.1)' }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm text-neutral-200 font-medium truncate">{value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Products section */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-neutral-100">Produtos em Destaque</h2>
            <button className="text-xs font-semibold text-brand-400 flex items-center space-x-0.5 hover:text-brand-300 transition-colors">
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-3"
          >
            {store.products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-4 pb-8"
        >
          <a
            href={`tel:${store.phone.replace(/\D/g, '')}`}
            className="flex items-center justify-center space-x-2 w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #FF8C32 0%, #FF6B00 60%, #E05A00 100%)',
              boxShadow: '0 4px 24px rgba(255,107,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <Phone className="w-4 h-4" />
            <span>Entrar em Contato</span>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
