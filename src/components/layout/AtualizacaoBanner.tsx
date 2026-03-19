import { useState, useEffect } from 'react';

const APP_BUILD = '2025-03-03-v3';
const STORAGE_KEY = 'app_build_seen';

export function AtualizacaoBanner() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const buildVisto = localStorage.getItem(STORAGE_KEY);
    if (buildVisto !== APP_BUILD) {
      setMostrar(true);
    }
  }, []);

  const fechar = () => {
    localStorage.setItem(STORAGE_KEY, APP_BUILD);
    setMostrar(false);
  };

  const forcarReload = () => {
    localStorage.setItem(STORAGE_KEY, APP_BUILD);
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    window.location.reload();
  };

  if (!mostrar) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)',
      color: 'white',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    }}>
      <span style={{ textAlign: 'center', lineHeight: '1.4' }}>
        ⚡ <strong>Sistema atualizado!</strong> Se a tela estiver em branco ou com erro, pressione{' '}
        <kbd style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 'bold',
          border: '1px solid rgba(255,255,255,0.3)',
        }}>Ctrl + Shift + R</kbd>{' '}
        para carregar a versão mais recente.
      </span>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={forcarReload}
          style={{
            padding: '6px 16px',
            background: 'white',
            color: '#1e3a5f',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🔄 Atualizar Agora
        </button>
        <button
          onClick={fechar}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ✕ Fechar
        </button>
      </div>
    </div>
  );
}
