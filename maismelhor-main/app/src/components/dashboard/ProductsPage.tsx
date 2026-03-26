'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Package, Edit2, Trash2, X, ImageIcon,
  CheckCircle, XCircle, Filter, ChevronDown, Star
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  available: boolean;
  sales: number;
  image?: string;
}

const initialProducts: Product[] = [
  { id: '1', name: 'X-Burguer Premium', price: 32.90, stock: 50, category: 'Lanches', available: true, sales: 142 },
  { id: '2', name: 'Combo Família', price: 89.90, stock: 20, category: 'Combos', available: true, sales: 87 },
  { id: '3', name: 'Batata Rústica G', price: 18.50, stock: 80, category: 'Acompanhamentos', available: true, sales: 203 },
  { id: '4', name: 'Suco Natural 500ml', price: 12.90, stock: 0, category: 'Bebidas', available: false, sales: 56 },
  { id: '5', name: 'Milk Shake Chocolate', price: 24.90, stock: 15, category: 'Bebidas', available: true, sales: 91 },
  { id: '6', name: 'Sobremesa do Dia', price: 15.90, stock: 8, category: 'Sobremesas', available: true, sales: 34 },
];

const categories = ['Todos', 'Lanches', 'Combos', 'Acompanhamentos', 'Bebidas', 'Sobremesas'];

interface ProductModalProps {
  onClose: () => void;
  onSave: (p: Product) => void;
}

function ProductModal({ onClose, onSave }: ProductModalProps) {
  const [form, setForm] = useState({
    name: '', price: '', stock: '', category: 'Lanches',
    description: '', available: true,
  });

  const handleSave = () => {
    if (!form.name || !form.price) return;
    onSave({
      id: Date.now().toString(),
      name: form.name,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      category: form.category,
      available: form.available,
      sales: 0,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="glass-2 rounded-2xl p-6 w-full max-w-lg border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold font-display text-neutral-100">Novo Produto</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image upload placeholder */}
        <div className="w-full h-32 rounded-xl border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center gap-2 mb-5 text-neutral-600 hover:border-brand-500/50 hover:text-brand-500/60 transition-colors cursor-pointer">
          <ImageIcon className="w-8 h-8" />
          <span className="text-xs">Clique para adicionar imagem</span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Nome do produto</label>
              <input className="input-glass" placeholder="Ex: X-Burguer Premium"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Preço (R$)</label>
              <input type="number" className="input-glass" placeholder="0,00"
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Estoque</label>
              <input type="number" className="input-glass" placeholder="0"
                value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Categoria</label>
              <select className="input-glass" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Descrição</label>
              <textarea className="input-glass h-20 py-3 resize-none" placeholder="Descreva o produto..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className="text-sm text-neutral-300">Disponível para venda</span>
            <button
              onClick={() => setForm(f => ({ ...f, available: !f.available }))}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${form.available ? 'bg-brand-500' : 'bg-neutral-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${form.available ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} className="btn-primary flex-1">Salvar produto</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const handleSave = (p: Product) => setProducts(prev => [p, ...prev]);
  const handleDelete = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const toggleAvailable = (id: string) => setProducts(prev =>
    prev.map(p => p.id === id ? { ...p, available: !p.available } : p)
  );

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-neutral-500">{products.length} produtos cadastrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input className="input-glass pl-10" placeholder="Buscar produtos..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 h-11 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'glass-1 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
              }`}
            >{cat}</button>
          ))}
        </div>
      </motion.div>

      {/* Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className="glass-2 rounded-2xl p-4 highlight-top group"
            >
              {/* Product image placeholder */}
              <div className="w-full h-36 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 mb-4 flex items-center justify-center relative overflow-hidden">
                <Package className="w-10 h-10 text-neutral-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <span className="absolute bottom-2 left-2 badge badge-neutral text-[10px]">{product.category}</span>
              </div>

              <h3 className="font-semibold text-neutral-100 text-sm mb-1 truncate">{product.name}</h3>

              <div className="flex items-center gap-1 mb-3">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span className="text-xs text-neutral-500">{product.sales} vendas</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-gradient">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                  product.stock === 0
                    ? 'bg-error/10 text-error'
                    : product.stock < 10
                    ? 'bg-warning/10 text-warning'
                    : 'bg-success/10 text-success'
                }`}>
                  {product.stock === 0 ? 'Sem estoque' : `${product.stock} un.`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleAvailable(product.id)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    product.available ? 'text-success' : 'text-neutral-500'
                  }`}
                >
                  {product.available
                    ? <CheckCircle className="w-4 h-4" />
                    : <XCircle className="w-4 h-4" />
                  }
                  {product.available ? 'Disponível' : 'Indisponível'}
                </button>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn-ghost w-8 h-8 p-0" aria-label="Editar">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(product.id)}
                    className="btn-ghost w-8 h-8 p-0 text-error hover:text-error hover:bg-error/10"
                    aria-label="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-neutral-600">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum produto encontrado</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ProductModal onClose={() => setShowModal(false)} onSave={handleSave} />
        )}
      </AnimatePresence>
    </div>
  );
}
