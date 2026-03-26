import * as React from 'react';
import { Clock, Zap } from 'lucide-react';
import { AnimatedCard } from '../ui/AnimatedCard';

export default function QuickDeliveryCards() {
  return (
    <div className="px-4 py-2 grid grid-cols-2 gap-4">
      <AnimatedCard interactive glass={2} className="p-4 glow-brand relative overflow-hidden bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/20">
        <div className="absolute -right-4 -bottom-4 opacity-10 blur-sm">
          <Zap className="w-24 h-24 text-brand-500" />
        </div>
        <div className="relative z-10 flex flex-col items-start">
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center mb-2 shadow-lg shadow-brand-500/40">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-brand-900 dark:text-brand-100 leading-tight">Chega<br/>Rapidinho</h3>
          <p className="text-[10px] text-brand-700 dark:text-brand-300 mt-1 uppercase font-medium">Bateu a fome?</p>
        </div>
      </AnimatedCard>
      
      <AnimatedCard interactive glass={1} className="p-4 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-5 blur-sm">
          <Clock className="w-24 h-24" />
        </div>
        <div className="relative z-10 flex flex-col items-start">
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100 leading-tight">Agendar<br/>Pedido</h3>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 uppercase font-medium">Para mais tarde</p>
        </div>
      </AnimatedCard>
    </div>
  );
}
