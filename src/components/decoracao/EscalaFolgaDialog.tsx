import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EscalaFolgaCalendario } from './EscalaFolgaCalendario';

interface EscalaFolgaDialogProps {
  disabled?: boolean;
}

export function EscalaFolgaDialog({ disabled }: EscalaFolgaDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 border-border bg-card font-semibold text-foreground shadow-sm hover:bg-muted"
          disabled={disabled}
          title={disabled ? 'Faça login para acessar' : ''}
        >
          <Calendar className="h-5 w-5" />
          Escala
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[98vw] w-[1600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Escala de Folga - Decoração</DialogTitle>
        </DialogHeader>
        <EscalaFolgaCalendario />
      </DialogContent>
    </Dialog>
  );
}
