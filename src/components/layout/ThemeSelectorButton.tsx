import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTheme, THEME_OPTIONS } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';

export function ThemeSelectorButton() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Escolher tema"
        >
          <Palette className="h-4 w-4" />
          Tema
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Tema do sistema</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                className={cn(
                  'rounded-lg border overflow-hidden text-left transition-all hover:border-primary/60',
                  isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                )}
                onClick={() => {
                  setTheme(opt.id);
                  setOpen(false);
                }}
              >
                <div className="flex h-28" style={{ background: opt.colors.background }}>
                  <div className="w-1/4 p-2 flex flex-col gap-1" style={{ background: opt.colors.sidebar }}>
                    <div className="h-2 w-full rounded-sm" style={{ background: opt.colors.primary }} />
                    <div className="h-1.5 w-3/4 rounded-sm opacity-40" style={{ background: opt.colors.text }} />
                    <div className="h-1.5 w-2/3 rounded-sm opacity-40" style={{ background: opt.colors.text }} />
                    <div className="h-1.5 w-3/4 rounded-sm opacity-40" style={{ background: opt.colors.text }} />
                  </div>
                  <div className="flex-1 p-2 flex flex-col gap-2">
                    <div className="h-6 rounded" style={{ background: opt.colors.card }} />
                    <div className="flex-1 rounded" style={{ background: opt.colors.card }} />
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between bg-card">
                  <span className="text-xs font-semibold">{opt.label}</span>
                  {isActive && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
