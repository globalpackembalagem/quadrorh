import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  handleReload = () => {
    // Limpa caches e localStorage corrompido
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    // Remove chunk reload flags
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('chunk_reload_')) sessionStorage.removeItem(key);
    });
    window.location.reload();
  };

  handleClearAndReload = () => {
    // Limpa tudo e recarrega
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f4f8',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#1a1a2e', marginBottom: '12px', fontSize: '20px' }}>
              Ocorreu um erro inesperado
            </h2>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
              Isso pode acontecer após uma atualização do sistema. 
              Tente recarregar a página.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b5998',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🔄 Recarregar Página
              </button>
              
              <button
                onClick={this.handleClearAndReload}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                🧹 Limpar Cache e Recarregar
              </button>
            </div>

            {this.state.error && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ color: '#999', fontSize: '12px', cursor: 'pointer' }}>
                  Detalhes técnicos
                </summary>
                <pre style={{
                  fontSize: '11px',
                  color: '#c00',
                  backgroundColor: '#fff5f5',
                  padding: '10px',
                  borderRadius: '6px',
                  marginTop: '8px',
                  overflow: 'auto',
                  maxHeight: '120px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
