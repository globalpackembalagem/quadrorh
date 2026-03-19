import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTheme, THEME_OPTIONS, Theme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function ThemeSelectorButton() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          title="Escolher tema"
        >
          <span>🎨</span>
          TEMA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">🎨 GALERIA DE TEMAS</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === opt.id;
            return (
              <div
                key={opt.id}
                className={cn(
                  'rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:scale-[1.02]',
                  isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                )}
                onClick={() => setTheme(opt.id)}
              >
                {/* Mini mockup */}
                <div className="flex h-28" style={{ background: opt.colors.background }}>
                  {/* Sidebar */}
                  <div className="w-1/4 p-1.5 flex flex-col gap-1" style={{ background: opt.colors.sidebar }}>
                    <div className="h-2 w-full rounded-sm opacity-60" style={{ background: opt.colors.primary }} />
                    <div className="h-1.5 w-3/4 rounded-sm opacity-30" style={{ background: opt.colors.text }} />
                    <div className="h-1.5 w-2/3 rounded-sm opacity-30" style={{ background: opt.colors.text }} />
                    <div className="h-1.5 w-3/4 rounded-sm opacity-30" style={{ background: opt.colors.text }} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-2 flex flex-col gap-1.5">
                    <div className="flex gap-1">
                      <div className="h-6 flex-1 rounded" style={{ background: opt.colors.card, border: `1px solid ${opt.colors.primary}22` }}>
                        <div className="h-1.5 w-1/2 rounded-sm m-1" style={{ background: opt.colors.primary, opacity: 0.7 }} />
                      </div>
                      <div className="h-6 flex-1 rounded" style={{ background: opt.colors.card, border: `1px solid ${opt.colors.primary}22` }}>
                        <div className="h-1.5 w-2/3 rounded-sm m-1" style={{ background: opt.colors.primary, opacity: 0.7 }} />
                      </div>
                    </div>
                    <div className="flex-1 rounded" style={{ background: opt.colors.card, border: `1px solid ${opt.colors.primary}22` }}>
                      <div className="h-1 w-full mt-2 mx-1" style={{ background: opt.colors.text, opacity: 0.1 }} />
                      <div className="h-1 w-full mt-1 mx-1" style={{ background: opt.colors.text, opacity: 0.1 }} />
                      <div className="h-1 w-3/4 mt-1 mx-1" style={{ background: opt.colors.text, opacity: 0.1 }} />
                    </div>
                  </div>
                </div>
                {/* Label */}
                <div className="p-2 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <div className="w-3 h-3 rounded-full border border-border/40" style={{ background: opt.colors.primary }} />
                      <div className="w-3 h-3 rounded-full border border-border/40" style={{ background: opt.colors.sidebar }} />
                      <div className="w-3 h-3 rounded-full border border-border/40" style={{ background: opt.colors.background }} />
                    </div>
                    <span className="text-[10px] font-semibold">{opt.label}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-primary" />}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
