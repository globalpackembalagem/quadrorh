'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, Clock, User, Package, CheckCircle, LayoutGrid, List, Phone } from 'lucide-react';

type DeliveryStatus = 'waiting' | 'collected' | 'on_route' | 'delivered';

interface Delivery {
  id: string;
  orderId: string;
  client: string;
  phone: string;
  address: string;
  courier: string;
  eta: string;
  status: DeliveryStatus;
  items: string;
  distance: string;
}

const statusFlow: { key: DeliveryStatus; label: string; color: string; icon: React.ElementType }[] = [
  { key: 'waiting',   label: 'Aguardando',  color: 'text-warning  bg-warning/10 border-warning/20',  icon: Clock },
  { key: 'collected', label: 'Coletado',    color: 'text-info     bg-info/10    border-info/20',     icon: Package },
  { key: 'on_route',  label: 'Em Rota',     color: 'text-brand-400 bg-brand-500/10 border-brand-500/20', icon: Truck },
  { key: 'delivered', label: 'Entregue',    color: 'text-success  bg-success/10 border-success/20', icon: CheckCircle },
];

const mockDeliveries: Delivery[] = [
  { id: 'D001', orderId: '#2401', client: 'Lucas Ferreira', phone: '(11) 99111-2222', address: 'Rua das Flores, 120 — Jd. América', courier: 'Carlos Motoboy', eta: '20 min', status: 'on_route', items: '2x X-Burguer, 1x Batata G', distance: '3.2 km' },
  { id: 'D002', orderId: '#2400', client: 'Ana Souza', phone: '(11) 98765-4321', address: 'Av. Paulista, 1500 — Bela Vista', courier: 'João Delivery', eta: '8 min', status: 'on_route', items: '1x Combo Família', distance: '1.8 km' },
  { id: 'D003', orderId: '#2398', client: 'Maria Lima', phone: '(11) 97654-3210', address: 'Rua Oscar Freire, 44 — Jardins', courier: 'Carlos Motoboy', eta: '—', status: 'waiting', items: '1x X-Burguer, 1x Suco', distance: '4.5 km' },
  { id: 'D004', orderId: '#2395', client: 'Roberto Nunes', phone: '(11) 96543-2109', address: 'Rua Augusta, 800 — Centro', courier: 'Paula Bike', eta: '—', status: 'collected', items: '3x Milk Shake', distance: '2.1 km' },
  { id: 'D005', orderId: '#2393', client: 'Fernanda Castro', phone: '(11) 95432-1098', address: 'Rua Pamplona, 300', courier: 'João Delivery', eta: 'Entregue', status: 'delivered', items: '1x Combo Família, 2x Suco', distance: '5.0 km' },
];

function statusIndex(status: DeliveryStatus) {
  return statusFlow.findIndex(s => s.key === status);
}

export default function DeliveriesPage() {
  const [view, setView] = useState<'list' | 'kanban'>('list');

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Stats */}
          {statusFlow.map(s => {
            const Icon = s.icon;
            const count = mockDeliveries.filter(d => d.status === s.key).length;
            return (
              <div key={s.key} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border ${s.color}`}>
                <Icon className="w-4 h-4" />
                <span>{count} {s.label}</span>
              </div>
            );
          })}
        </div>
        {/* View toggle */}
        <div className="flex gap-1 glass-1 p-1 rounded-xl">
          <button onClick={() => setView('list')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${view === 'list' ? 'bg-brand-500 text-white' : 'text-neutral-400'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView('kanban')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${view === 'kanban' ? 'bg-brand-500 text-white' : 'text-neutral-400'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {view === 'list' ? (
        // List view
        <div className="space-y-3">
          {mockDeliveries.map((d, i) => {
            const sidx = statusIndex(d.status);
            const cfg = statusFlow[sidx];
            const Icon = cfg.icon;
            return (
              <motion.div key={d.id}
                initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-2 rounded-2xl p-5 highlight-top">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-neutral-100 text-sm">{d.id}</span>
                        <span className="text-neutral-600 text-xs">{d.orderId}</span>
                        <span className={`badge border ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-neutral-300 mb-1">
                        <User className="w-3.5 h-3.5 text-neutral-500" />
                        {d.client}
                        <span className="text-neutral-600">·</span>
                        <Phone className="w-3 h-3 text-neutral-500" />
                        <span className="text-neutral-500 text-xs">{d.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <MapPin className="w-3 h-3" />
                        {d.address}
                      </div>
                      <p className="text-xs text-neutral-600 mt-1">{d.items}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-right">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Truck className="w-3.5 h-3.5" />
                      <span>{d.courier}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      <span className={d.status === 'on_route' ? 'text-brand-400 font-medium' : 'text-neutral-500'}>
                        ETA: {d.eta}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-600">{d.distance}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex gap-1">
                    {statusFlow.map((s, si) => (
                      <div key={s.key}
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                          si <= sidx ? 'bg-brand-500' : 'bg-neutral-800'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {statusFlow.map(s => (
                      <span key={s.key} className="text-[10px] text-neutral-600">{s.label}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        // Kanban view
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statusFlow.map((col, ci) => {
            const colDeliveries = mockDeliveries.filter(d => d.status === col.key);
            const Icon = col.icon;
            return (
              <motion.div key={col.key}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.08 }}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-sm font-medium border ${col.color}`}>
                  <Icon className="w-4 h-4" />
                  {col.label}
                  <span className="ml-auto text-xs opacity-70">{colDeliveries.length}</span>
                </div>
                <div className="space-y-2">
                  {colDeliveries.map(d => (
                    <div key={d.id} className="glass-1 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-neutral-300">{d.id}</span>
                        <span className="text-xs text-neutral-600">{d.orderId}</span>
                      </div>
                      <p className="text-sm font-medium text-neutral-200">{d.client}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">{d.address}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-neutral-600">{d.courier}</span>
                        {d.status === 'on_route' && (
                          <span className="text-xs text-brand-400 font-medium">{d.eta}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {colDeliveries.length === 0 && (
                    <p className="text-center text-sm text-neutral-700 py-4">Nenhuma</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
