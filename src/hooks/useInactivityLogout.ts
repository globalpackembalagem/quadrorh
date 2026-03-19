import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { toast } from 'sonner';

const LAST_ACTIVITY_KEY = 'ultima_atividade_ts';
const LOGIN_TIMESTAMP_KEY = 'login_timestamp';
const GRACE_PERIOD_MS = 60_000; // 60 segundos de graça após login (cobre redirecionamentos)

export function useInactivityLogout() {
  const { isRHMode, sairModoRH, userRole } = useAuth();
  const { usuarioAtual } = useUsuario();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nomeRef = useRef(userRole?.nome);

  // Manter nome atualizado sem causar re-renders do effect
  nomeRef.current = userRole?.nome;

  const tempoMinutos = usuarioAtual.tempo_inatividade || 4;
  const timeoutMs = tempoMinutos * 60 * 1000;

  const doLogout = useCallback(() => {
    const nome = nomeRef.current || 'USUÁRIO';
    console.log(`[Inatividade] Logout por inatividade: ${nome} (${tempoMinutos} min)`);
    toast.warning(`SESSÃO EXPIRADA - ${nome} foi desconectado por inatividade (${tempoMinutos} min).`);
    sairModoRH();
  }, [tempoMinutos, sairModoRH]);

  const resetTimer = useCallback(() => {
    if (!isRHMode) return;
    if (tempoMinutos === 0) return;

    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doLogout, timeoutMs);
  }, [isRHMode, tempoMinutos, timeoutMs, doLogout]);

  useEffect(() => {
    if (!isRHMode || tempoMinutos === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const now = Date.now();
    const loginTs = Number(localStorage.getItem(LOGIN_TIMESTAMP_KEY) || 0);
    const timeSinceLogin = now - loginTs;

    // PROTEÇÃO PRINCIPAL: Se o login foi há menos de 60 segundos, SEMPRE iniciar timer completo
    // Isso evita logout imediato causado por timestamps de sessões anteriores
    if (loginTs > 0 && timeSinceLogin < GRACE_PERIOD_MS) {
      console.log(`[Inatividade] Período de graça pós-login (${Math.round(timeSinceLogin / 1000)}s) - timer completo de ${tempoMinutos}min`);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doLogout, timeoutMs);
    } else {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      const elapsed = lastActivity > 0 ? now - lastActivity : 0;
      const remaining = timeoutMs - elapsed;

      // NUNCA fazer logout imediato no mount - sempre dar pelo menos 30s
      if (lastActivity > 0 && remaining <= 0) {
        console.log(`[Inatividade] Sessão expirada (${Math.round(elapsed / 1000)}s) - logout em 2s`);
        if (timerRef.current) clearTimeout(timerRef.current);
        // Pequeno delay para evitar flash de tela branca
        timerRef.current = setTimeout(doLogout, 2000);
      } else if (lastActivity > 0 && remaining < timeoutMs) {
        console.log(`[Inatividade] Tempo restante: ${Math.round(remaining / 1000)}s`);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(doLogout, remaining);
      } else {
        console.log(`[Inatividade] Timer completo: ${tempoMinutos}min`);
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(doLogout, timeoutMs);
      }
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRHMode, tempoMinutos, timeoutMs, resetTimer, doLogout]);
}