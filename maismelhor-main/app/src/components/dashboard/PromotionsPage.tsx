'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Tag, X, Percent, Calendar, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

type PromoStatus = 'active' | 'scheduled' | 'expired';

interface Promo {
  id: string;
  name: string;
  discount: number;
  type: 'percent' | 'fixed';
  products: string;
  startDate: string;
  endDate: string;
  status: PromoStatus;
  uses: number;
  maxUses: number;
  enabled: boolean;
}

const statusConfig: Record<PromoStatus, { label: string; badge: string }> = {
  active:    { label: 'Ativa',       badge: 'badge-success' },
  scheduled: { label: 'Agendada',    badge: 'badge-info' },
  expired:   { label: 'Expirada',    badge: 'badge-neutral' },
};

const mockPromos: Promo[] = [
  { id: '1', name: 'Desconto Fim de Semana', discount: 15, type: 'percent', products: 'Todos os lanches', startDate: '08/03/2026', endDate: '16/03/2026', status: 'active', uses: 42, maxUses: 100, enabled: true },
  { id: '2', name: 'Promoção Drink + Lanche', discount: 10, type: 'percent', products: 'Combos e Bebidas', startDate: '15/03/2026', endDate: '22/03/2026', status: 'scheduled', uses: 0, maxUses: 50, enabled: true },
  { id: '3', name: 'Happy Hour', discount: 5, type: 'fixed', products: 'Bebidas', startDate: '01/03/2026', endDate: '07/03/2026', status: 'expired', uses: 78, maxUses: 80, enabled: false },
];

interface PromoModalProps { onClose: () => void; }
function PromoModal({ onClose }: PromoModalProps) {
  const [form, setForm] = useState({ name: '', discount: '', type: 'percent', products: '', startDate: '', endDate: '', maxUses: '' });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-2 rounded-2xl p-6 w-full max-w-md border border-white/10"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold font-display text-neutral-100">Nova Promoção</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Nome da promoção</label>
            <input className="input-glass" placeholder="Ex: Desconto de Verão"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Desconto</label>
              <input type="number" className="input-glass" placeholder="15"
                value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Tipo</label>
              <select className="input-glass" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Início</label>
              <input type="date" className="input-glass" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Fim</label>
              <input type="date" className="input-glass" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Produtos aplicáveis</label>
              <input className="input-glass" placeholder="Ex: Todos os lanches, Bebidas..."
                value={form.products} onChange={e => setForm(f => ({ ...f, products: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Limite de usos</label>
              <input type="number" className="input-glass" placeholder="Deixe vazio para ilimitado"
                value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={onClose} className="btn-primary flex-1">Criar promoção</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promo[]>(mockPromos);
  const [showModal, setShowModal] = useState(false);

  const togglePromo = (id: string) =>
    setPromos(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{promos.filter(p => p.status === 'active').length} promoções ativas</p>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Promoção
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ativas', value: promos.filter(p => p.status === 'active').length, color: 'text-success bg-success/10' },
          { label: 'Agendadas', value: promos.filter(p => p.status === 'scheduled').length, color: 'text-info bg-info/10' },
          { label: 'Total de usos', value: promos.reduce((acc, p) => acc + p.uses, 0), color: 'text-brand-400 bg-brand-500/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-2 rounded-2xl p-4 highlight-top text-center">
            <p className={`text-2xl font-bold font-display mb-1 ${s.color.split(' ')[0]}`}>{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Promos list */}
      <div className="space-y-3">
        <AnimatePresence>
          {promos.map((promo, i) => {
            const cfg = statusConfig[promo.status];
            const progress = Math.round((promo.uses / promo.maxUses) * 100);
            return (
              <motion.div key={promo.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`glass-2 rounded-2xl p-5 highlight-top transition-opacity ${!promo.enabled ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      promo.status === 'active' ? 'bg-brand-500/15 text-brand-400' :
                      promo.status === 'scheduled' ? 'bg-info/15 text-info' : 'bg-neutral-700/50 text-neutral-500'
                    }`}>
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-100 text-sm">{promo.name}</h3>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          {promo.discount}{promo.type === 'percent' ? '%' : ' R$'} de desconto
                        </span>
                        <span>•</span>
                        <span>{promo.products}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {promo.startDate} → {promo.endDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => togglePromo(promo.id)} className="flex-shrink-0"
                    aria-label={promo.enabled ? 'Desativar' : 'Ativar'}>
                    {promo.enabled
                      ? <ToggleRight className="w-7 h-7 text-brand-400" />
                      : <ToggleLeft className="w-7 h-7 text-neutral-600" />
                    }
                  </button>
                </div>

                {promo.maxUses > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
                      <span>Uso: {promo.uses}/{promo.maxUses}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                        className={`h-full rounded-full ${
                          progress > 80 ? 'bg-error' : progress > 50 ? 'bg-warning' : 'bg-brand-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && <PromoModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
