'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Save, MapPin, Phone, Clock, Image, Star,
  Package, ShoppingBag, TrendingUp, CheckCircle
} from 'lucide-react';

const openingHours = [
  { day: 'Segunda', open: '08:00', close: '22:00', enabled: true },
  { day: 'Terça',   open: '08:00', close: '22:00', enabled: true },
  { day: 'Quarta',  open: '08:00', close: '22:00', enabled: true },
  { day: 'Quinta',  open: '08:00', close: '22:00', enabled: true },
  { day: 'Sexta',   open: '08:00', close: '23:00', enabled: true },
  { day: 'Sábado',  open: '09:00', close: '23:00', enabled: true },
  { day: 'Domingo', open: '10:00', close: '20:00', enabled: false },
];

export default function StorePage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: 'Mais Melhor Lanches',
    description: 'Os melhores lanches artesanais da região, feitos com ingredientes frescos e muito amor.',
    phone: '(11) 99876-5432',
    whatsapp: '(11) 99876-5432',
    street: 'Rua das Flores, 120',
    city: 'São Paulo',
    state: 'SP',
    zip: '01310-100',
    logoUrl: '',
  });
  const [hours, setHours] = useState(openingHours);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleDay = (idx: number) => {
    setHours(prev => prev.map((h, i) => i === idx ? { ...h, enabled: !h.enabled } : h));
  };

  return (
    <div className="space-y-5 pb-6 max-w-4xl">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Produtos ativos', value: '47', icon: Package, color: 'text-brand-400 bg-brand-500/10' },
          { label: 'Pedidos hoje', value: '23', icon: ShoppingBag, color: 'text-success bg-success/10' },
          { label: 'Avaliação', value: '4.8 ★', icon: Star, color: 'text-warning bg-warning/10' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass-2 rounded-2xl p-4 highlight-top flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold font-display text-neutral-100">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: store form */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-4">
          
          {/* Basic info */}
          <div className="glass-2 rounded-2xl p-5 highlight-top">
            <h3 className="text-sm font-semibold text-neutral-100 mb-4 flex items-center gap-2">
              <Store className="w-4 h-4 text-brand-400" /> Informações básicas
            </h3>
            <div className="space-y-4">
              {/* Logo */}
              <div>
                <label className="text-xs font-medium text-neutral-400 mb-2 block">Logo da loja</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
                    <Store className="w-8 h-8 text-white" />
                  </div>
                  <button className="btn-secondary text-sm">
                    <Image className="w-4 h-4" /> Alterar logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Nome da loja</label>
                  <input className="input-glass" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Descrição</label>
                  <textarea className="input-glass h-20 py-3 resize-none" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Telefone</label>
                  <input className="input-glass" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">WhatsApp</label>
                  <input className="input-glass" value={form.whatsapp}
                    onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="glass-2 rounded-2xl p-5 highlight-top">
            <h3 className="text-sm font-semibold text-neutral-100 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" /> Endereço
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Rua / Logradouro</label>
                <input className="input-glass" value={form.street}
                  onChange={e => setForm(f => ({ ...f, street: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Cidade</label>
                <input className="input-glass" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400 mb-1.5 block">CEP</label>
                <input className="input-glass" value={form.zip}
                  onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
              </div>
            </div>
          </div>

          <button onClick={handleSave}
            className={`btn-primary w-full transition-all ${saved ? 'bg-success hover:bg-success' : ''}`}>
            {saved ? <><CheckCircle className="w-4 h-4" /> Salvo!</> : <><Save className="w-4 h-4" /> Salvar alterações</>}
          </button>
        </motion.div>

        {/* Right: opening hours */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="glass-2 rounded-2xl p-5 highlight-top">
          <h3 className="text-sm font-semibold text-neutral-100 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" /> Horários
          </h3>
          <div className="space-y-3">
            {hours.map((h, i) => (
              <div key={h.day} className={`p-3 rounded-xl transition-all ${h.enabled ? 'bg-white/[0.04]' : 'opacity-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-200">{h.day}</span>
                  <button
                    onClick={() => toggleDay(i)}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${h.enabled ? 'bg-brand-500' : 'bg-neutral-700'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${h.enabled ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
                {h.enabled && (
                  <div className="flex gap-2 text-xs text-neutral-500">
                    <span>Abre: <strong className="text-neutral-300">{h.open}</strong></span>
                    <span>•</span>
                    <span>Fecha: <strong className="text-neutral-300">{h.close}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
