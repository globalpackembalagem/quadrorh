import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SessionTimer() {
  const { isRHMode } = useAuth();
  const { usuarioAtual } = useUsuario();
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  const tempoMinutos = usuarioAtual.tempo_inatividade || 4;

  // Atualizar último timestamp de atividade
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isRHMode || tempoMinutos === 0) {
      setRemaining(null);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const timeoutMs = tempoMinutos * 60 * 1000;
      const rem = Math.max(0, timeoutMs - elapsed);
      setRemaining(Math.ceil(rem / 1000));
    }, 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [isRHMode, tempoMinutos, updateActivity]);

  if (!isRHMode || tempoMinutos === 0 || remaining === null) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining < 60; // menos de 1 minuto
  const isWarning = remaining < 120; // menos de 2 minutos

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors",
        isLow
          ? "bg-destructive/20 text-destructive animate-pulse"
          : isWarning
          ? "bg-warning/20 text-warning-foreground"
          : "text-muted-foreground"
      )}
      title={`Sessão expira em ${minutes}m ${seconds}s por inatividade`}
    >
      <Clock className="h-3 w-3" />
      <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
}
