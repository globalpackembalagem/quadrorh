import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTempoInatividadeMinutos } from '@/lib/inatividade';

const LAST_ACTIVITY_KEY = 'ultima_atividade_ts';
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart', 'touchmove', 'click', 'focus'];

export function SessionTimer() {
  const { isRHMode } = useAuth();
  const { usuarioAtual } = useUsuario();
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  const tempoMinutos = getTempoInatividadeMinutos(usuarioAtual.nome);

  // Atualizar último timestamp de atividade
  const updateActivity = useCallback(() => {
    const agora = Date.now();
    lastActivityRef.current = agora;
    localStorage.setItem(LAST_ACTIVITY_KEY, String(agora));
  }, []);

  useEffect(() => {
    if (!isRHMode || tempoMinutos === 0) {
      setRemaining(null);
      return;
    }

    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    lastActivityRef.current = lastActivity > 0 ? lastActivity : Date.now();

    const onVisibilityChange = () => {
      if (!document.hidden) updateActivity();
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const timeoutMs = tempoMinutos * 60 * 1000;
      const rem = Math.max(0, timeoutMs - elapsed);
      setRemaining(Math.ceil(rem / 1000));
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, updateActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
