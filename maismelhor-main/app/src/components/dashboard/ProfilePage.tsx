'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Crown, CreditCard, Shield, Settings, Camera,
  Check, ChevronRight, Zap, Star, Building2, AlertTriangle, Bell
} from 'lucide-react';

const PLANS = [
  {
    id: 'basic', name: 'Básico', price: 49.90,
    features: ['Até 30 produtos', 'Até 100 pedidos/mês', 'Suporte básico'],
    color: 'text-neutral-400',
  },
  {
    id: 'pro', name: 'Pro', price: 99.90,
    features: ['Até 200 produtos', 'Pedidos ilimitados', 'Analytics', 'Promoções', 'Suporte prioritário'],
    color: 'text-brand-400',
    current: true,
  },
  {
    id: 'business', name: 'Business', price: 199.90,
    features: ['Produtos ilimitados', 'Pedidos ilimitados', 'Sistema de entrega', 'Domínio próprio', 'API access'],
    color: 'text-warning',
  },
];

const billingHistory = [
  { date: '11/02/2026', plan: 'Pro',    amount: 99.90, status: 'paid' },
  { date: '11/01/2026', plan: 'Pro',    amount: 99.90, status: 'paid' },
  { date: '11/12/2025', plan: 'Básico', amount: 49.90, status: 'paid' },
  { date: '11/11/2025', plan: 'Básico', amount: 49.90, status: 'paid' },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('perfil');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ name: 'Carlos Admin', email: 'admin@maismelhor.com.br', phone: '(11) 98765-4321' });

  const tabs = [
    { key: 'perfil',   label: 'Meu Perfil',   icon: User },
    { key: 'plano',    label: 'Plano',         icon: Crown },
    { key: 'cobranca', label: 'Cobrança',      icon: CreditCard },
    { key: 'seguranca', label: 'Segurança',    icon: Shield },
  ];

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="space-y-5 pb-6 max-w-4xl">
      {/* Profile header card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-2 rounded-2xl p-5 highlight-top">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center shadow-xl shadow-brand-500/25">
              <User className="w-10 h-10 text-white" />
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center shadow-lg"
              aria-label="Alterar foto">
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold font-display text-neutral-100">{profile.name}</h2>
              <span className="badge badge-brand flex items-center gap-1">
                <Crown className="w-3 h-3" /> Administrador
              </span>
            </div>
            <p className="text-sm text-neutral-500">{profile.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-brand-400 fill-brand-400" />
              <span className="text-xs text-brand-400 font-medium">Plano Pro</span>
              <span className="text-neutral-700 text-xs mx-1">·</span>
              <span className="text-xs text-neutral-600">Membro desde Mar 2025</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 glass-1 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}>

        {activeTab === 'perfil' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-2 rounded-2xl p-5 highlight-top space-y-4">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-400" /> Informações pessoais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Nome completo</label>
                  <input className="input-glass" value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">E-mail</label>
                  <input className="input-glass" value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Telefone</label>
                  <input className="input-glass" value={profile.phone}
                    onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleSave}
                className={`btn-primary ${saved ? 'bg-success hover:bg-success' : ''}`}>
                {saved ? <><Check className="w-4 h-4" /> Salvo!</> : 'Salvar alterações'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="glass-2 rounded-2xl p-4 highlight-top">
                <h4 className="text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Conta</h4>
                {[
                  { icon: Building2, label: 'Gerenciar Loja', href: '/dashboard/loja' },
                  { icon: Bell,      label: 'Notificações',   href: '#' },
                  { icon: Settings,  label: 'Configurações',  href: '#' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <a key={item.label} href={item.href}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors no-underline">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm text-neutral-300">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-600" />
                    </a>
                  );
                })}
              </div>

              <div className="glass-2 rounded-2xl p-4 highlight-top border border-error/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <h4 className="text-xs font-semibold text-error uppercase tracking-wider">Zona de Perigo</h4>
                </div>
                <button className="text-sm text-error/70 hover:text-error transition-colors text-left">
                  Encerrar conta permanentemente
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plano' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`glass-2 rounded-2xl p-5 highlight-top relative ${plan.current ? 'glow-brand' : ''}`}>
                {plan.current && (
                  <div className="absolute -top-2.5 left-4">
                    <span className="badge badge-brand text-[10px] px-2">Plano atual</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <Zap className={`w-5 h-5 ${plan.color}`} />
                  <span className={`font-bold font-display text-lg ${plan.color}`}>{plan.name}</span>
                </div>
                <p className="text-3xl font-bold text-neutral-100 mb-1">
                  R$ {plan.price.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-neutral-500 mb-4">/mês</p>
                <ul className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-300">
                      <Check className={`w-4 h-4 ${plan.color} flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={plan.current ? 'btn-secondary w-full' : 'btn-primary w-full'}>
                  {plan.current ? 'Plano ativo' : 'Fazer upgrade'}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'cobranca' && (
          <div className="glass-2 rounded-2xl overflow-hidden border border-white/[0.06]">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-100">Histórico de cobrança</h3>
              <span className="badge badge-success">Pagamento em dia</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Data', 'Plano', 'Valor', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((b, i) => (
                  <motion.tr key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-neutral-300">{b.date}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge badge-brand">{b.plan}</span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-neutral-100">
                      R$ {b.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge badge-success flex items-center gap-1 w-fit">
                        <Check className="w-3 h-3" /> Pago
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div className="p-5">
              <button className="btn-secondary text-sm">
                <CreditCard className="w-4 h-4" /> Alterar método de pagamento
              </button>
            </div>
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="max-w-md space-y-4">
            <div className="glass-2 rounded-2xl p-5 highlight-top space-y-4">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-400" /> Alterar senha
              </h3>
              {['Senha atual', 'Nova senha', 'Confirmar nova senha'].map(label => (
                <div key={label}>
                  <label className="text-xs font-medium text-neutral-400 mb-1.5 block">{label}</label>
                  <input type="password" className="input-glass" placeholder="••••••••" />
                </div>
              ))}
              <button className="btn-primary">Atualizar senha</button>
            </div>

            <div className="glass-2 rounded-2xl p-5 highlight-top">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-100">Autenticação 2FA</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Proteção extra para sua conta</p>
                </div>
                <button className="btn-secondary text-sm">Ativar</button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
