'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Search, Filter, ChevronDown, Eye, X, Clock,
  CheckCircle, XCircle, Truck, ChefHat, AlertCircle
} from 'lucide-react';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  client: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  date: string;
  address: string;
}

const statusConfig: Record<OrderStatus, { label: string; badge: string; icon: React.ElementType }> = {
  pending:    { label: 'Pendente',    badge: 'badge-warning', icon: Clock },
  confirmed:  { label: 'Confirmado', badge: 'badge-info',    icon: CheckCircle },
  preparing:  { label: 'Preparando', badge: 'badge-brand',   icon: ChefHat },
  delivering: { label: 'Em rota',    badge: 'badge-info',    icon: Truck },
  done:       { label: 'Entregue',   badge: 'badge-success', icon: CheckCircle },
  cancelled:  { label: 'Cancelado',  badge: 'badge-error',   icon: XCircle },
};

const mockOrders: Order[] = [
  { id: '#2401', client: 'Lucas Ferreira', items: [{ name: 'X-Burguer Premium', qty: 2, price: 32.90 }, { name: 'Batata G', qty: 1, price: 18.50 }], total: 84.30, status: 'pending', date: '11/03 22:45', address: 'Rua das Flores, 120 — Jd. América' },
  { id: '#2400', client: 'Ana Souza', items: [{ name: 'Combo Família', qty: 1, price: 89.90 }], total: 89.90, status: 'delivering', date: '11/03 22:10', address: 'Av. Paulista, 1500 — Bela Vista' },
  { id: '#2399', client: 'Pedro Alves', items: [{ name: 'Milk Shake', qty: 2, price: 24.90 }], total: 49.80, status: 'done', date: '11/03 21:30', address: 'Rua Augusta, 300 — Centro' },
  { id: '#2398', client: 'Maria Lima', items: [{ name: 'X-Burguer Premium', qty: 1, price: 32.90 }, { name: 'Suco Natural', qty: 1, price: 12.90 }], total: 45.80, status: 'confirmed', date: '11/03 20:55', address: 'Rua Oscar Freire, 44 — Jardins' },
  { id: '#2397', client: 'João Costa', items: [{ name: 'Combo Família', qty: 2, price: 89.90 }], total: 179.80, status: 'preparing', date: '11/03 20:20', address: 'Rua Pamplona, 900 — Jardim Paulista' },
  { id: '#2396', client: 'Carla Dias', items: [{ name: 'Sobremesa do Dia', qty: 1, price: 15.90 }], total: 15.90, status: 'cancelled', date: '11/03 19:15', address: 'Rua Haddock Lobo, 200' },
];

const tabs = [
  { key: 'all',       label: 'Todos', count: 6 },
  { key: 'pending',   label: 'Pendentes', count: 1 },
  { key: 'preparing', label: 'Em andamento', count: 2 },
  { key: 'done',      label: 'Concluídos', count: 1 },
];

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivering', 'done'];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = mockOrders.filter(o => {
    const matchTab = activeTab === 'all' || o.status === activeTab ||
      (activeTab === 'preparing' && ['confirmed', 'preparing', 'delivering'].includes(o.status));
    const matchSearch = o.client.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    return matchTab && matchSearch;
  });

  const advanceStatus = (order: Order) => {
    const idx = statusOrder.indexOf(order.status);
    if (idx < statusOrder.length - 1) {
      // In real app this would call an API
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 glass-1 p-1 rounded-xl">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 h-9 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-neutral-700 text-neutral-400'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input className="input-glass pl-9 w-56" placeholder="Buscar pedido ou cliente..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </motion.div>

      {/* Orders table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="glass-2 rounded-2xl overflow-hidden border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Pedido', 'Cliente', 'Itens', 'Total', 'Status', 'Horário', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((order, i) => {
                const cfg = statusConfig[order.status];
                const Icon = cfg.icon;
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-neutral-300">{order.id}</td>
                    <td className="px-4 py-3 text-neutral-200 font-medium">{order.client}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {order.items.map(i => `${i.qty}x ${i.name}`).join(', ').substring(0, 30)}
                      {order.items.map(i => `${i.qty}x ${i.name}`).join(', ').length > 30 ? '...' : ''}
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-100">
                      R$ {order.total.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cfg.badge} flex items-center gap-1 w-fit`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{order.date}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedOrder(order)} className="btn-ghost h-8 px-2 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-neutral-600">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum pedido encontrado</p>
          </div>
        )}
      </motion.div>

      {/* Order detail panel */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="glass-3 w-full max-w-sm h-full overflow-y-auto border-l border-white/10 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-neutral-100 font-display">Pedido {selectedOrder.id}</h3>
                <button onClick={() => setSelectedOrder(null)} className="btn-ghost w-8 h-8 p-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="glass-1 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-1">Cliente</p>
                  <p className="font-medium text-neutral-100">{selectedOrder.client}</p>
                  <p className="text-xs text-neutral-500 mt-2 mb-1">Endereço</p>
                  <p className="text-sm text-neutral-300">{selectedOrder.address}</p>
                </div>

                <div className="glass-1 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-3">Itens do pedido</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-300">{item.qty}x {item.name}</span>
                        <span className="text-neutral-400">R$ {(item.qty * item.price).toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/[0.06] pt-2 flex justify-between font-semibold">
                      <span className="text-neutral-200">Total</span>
                      <span className="text-brand-400">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-1 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-2">Status atual</p>
                  <span className={`badge ${statusConfig[selectedOrder.status].badge}`}>
                    {statusConfig[selectedOrder.status].label}
                  </span>
                </div>

                {selectedOrder.status !== 'done' && selectedOrder.status !== 'cancelled' && (
                  <button className="btn-primary w-full">
                    Avançar status
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
