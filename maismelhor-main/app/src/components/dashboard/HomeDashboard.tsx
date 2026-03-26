'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  MousePointerClick, Eye, ShoppingCart, TrendingUp,
  ArrowUpRight, ArrowDownRight, Package, Clock
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────
const visitasData = [
  { dia: 'Seg', visitas: 420, cliques: 320 },
  { dia: 'Ter', visitas: 580, cliques: 410 },
  { dia: 'Qua', visitas: 390, cliques: 290 },
  { dia: 'Qui', visitas: 720, cliques: 560 },
  { dia: 'Sex', visitas: 890, cliques: 680 },
  { dia: 'Sáb', visitas: 1100, cliques: 820 },
  { dia: 'Dom', visitas: 760, cliques: 590 },
];

const comprasData = [
  { dia: 'Seg', compras: 28, receita: 1240 },
  { dia: 'Ter', compras: 42, receita: 2180 },
  { dia: 'Qua', compras: 31, receita: 1590 },
  { dia: 'Qui', compras: 58, receita: 3120 },
  { dia: 'Sex', compras: 74, receita: 4380 },
  { dia: 'Sáb', compras: 92, receita: 5640 },
  { dia: 'Dom', compras: 63, receita: 3890 },
];

const conversaoData = [
  { dia: 'Seg', taxa: 6.7, meta: 8 },
  { dia: 'Ter', taxa: 7.2, meta: 8 },
  { dia: 'Qua', taxa: 7.9, meta: 8 },
  { dia: 'Qui', taxa: 8.1, meta: 8 },
  { dia: 'Sex', taxa: 8.3, meta: 8 },
  { dia: 'Sáb', taxa: 8.5, meta: 8 },
  { dia: 'Dom', taxa: 8.3, meta: 8 },
];

// ── Animated counter ──────────────────────────────────────
function useCounter(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ── Custom tooltip ─────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-900/60 backdrop-blur-xl rounded-xl px-4 py-3 border border-white/10 shadow-2xl">
      <p className="text-xs text-neutral-400 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: {typeof p.value === 'number' && p.value > 100
            ? p.value.toLocaleString('pt-BR')
            : p.value}
          {p.name === 'taxa' || p.name === 'meta' ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

// ── KPI Card ───────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change: number;
  icon: React.ElementType;
  color: string;
  delay: number;
}

function KPICard({ label, value, prefix, suffix, change, icon: Icon, color, delay }: KPICardProps) {
  const count = useCounter(value);
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="glass-2 rounded-2xl p-5 highlight-top relative overflow-hidden group"
    >
      {/* Background icon */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-[0.15] ${color}`} />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-15`}>
          <Icon className="w-5 h-5" style={{ color: 'currentColor' }} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      </div>

      <p className="text-2xl font-bold font-display text-neutral-100 mb-1">
        {prefix}{count.toLocaleString('pt-BR')}{suffix}
      </p>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-xs text-neutral-600 mt-1">vs semana passada</p>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function HomeDashboard() {
  const chartConfig = {
    grid: { stroke: 'rgba(255,255,255,0.04)', strokeDasharray: '4 4' },
    axis: { tick: { fill: '#605C58', fontSize: 11 }, axisLine: false, tickLine: false },
  };

  return (
    <div className="space-y-6 pb-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Cliques" value={18420} change={12.4} icon={MousePointerClick}
          color="bg-brand-500 text-brand-400" delay={0} />
        <KPICard label="Visitas" value={5860} change={8.7} icon={Eye}
          color="bg-info text-info" delay={0.08} />
        <KPICard label="Compras" value={388} change={-3.2} icon={ShoppingCart}
          color="bg-success text-success" delay={0.16} />
        <KPICard label="Receita" value={21940} prefix="R$ " change={15.8} icon={TrendingUp}
          color="bg-warning text-warning" delay={0.24} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart — Visitas & Cliques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-2 rounded-2xl p-5 highlight-top"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Visitas & Cliques</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
                Cliques
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-info inline-block" />
                Visitas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={visitasData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCliques" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B00" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FF6B00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradVisitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...chartConfig.grid} />
              <XAxis dataKey="dia" {...chartConfig.axis} />
              <YAxis {...chartConfig.axis} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="visitas" name="visitas" stroke="#3B82F6" strokeWidth={2}
                fill="url(#gradVisitas)" isAnimationActive={true} animationBegin={600} animationDuration={1500} animationEasing="ease-out" />
              <Area type="monotone" dataKey="cliques" name="cliques" stroke="#FF6B00" strokeWidth={2}
                fill="url(#gradCliques)" isAnimationActive={true} animationBegin={600} animationDuration={1500} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar Chart — Compras */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="glass-2 rounded-2xl p-5 highlight-top"
        >
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-neutral-100">Compras / Dia</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Últimos 7 dias</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comprasData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...chartConfig.grid} />
              <XAxis dataKey="dia" {...chartConfig.axis} />
              <YAxis {...chartConfig.axis} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255, 0.08)' }} />
              <Bar dataKey="compras" name="compras" fill="#22C55E" radius={[4, 4, 0, 0]}
                maxBarSize={32} fillOpacity={0.85} isAnimationActive={true} animationBegin={700} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart — Taxa de Conversão */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-2 glass-2 rounded-2xl p-5 highlight-top"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Taxa de Conversão</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Cliques → Compras (%)</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                Taxa atual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-neutral-600 inline-block" />
                Meta
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={conversaoData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...chartConfig.grid} />
              <XAxis dataKey="dia" {...chartConfig.axis} />
              <YAxis {...chartConfig.axis} domain={[5, 10]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="meta" name="meta" stroke="#3D3A37"
                strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={true} animationBegin={800} animationDuration={1500} />
              <Line type="monotone" dataKey="taxa" name="taxa" stroke="#F59E0B"
                strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#F59E0B' }} isAnimationActive={true} animationBegin={800} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
          className="glass-2 rounded-2xl p-5 highlight-top space-y-3"
        >
          <h3 className="text-sm font-semibold text-neutral-100 mb-4">Status Rápido</h3>

          {[
            { label: 'Pedidos pendentes', value: '12', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Produtos ativos', value: '47', icon: Package, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Entregas em rota', value: '3', icon: ShoppingCart, color: 'text-info', bg: 'bg-info/10' },
            { label: 'Promoções ativas', value: '2', icon: TrendingUp, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-sm text-neutral-400">{stat.label}</span>
                </div>
                <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
