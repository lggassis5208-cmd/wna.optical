import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);

    // Se o erro foi falha ao carregar chunk de novo deploy (Vite dynamic import)
    const isChunkError = 
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('lis_last_chunk_reload');
      const now = Date.now();
      // Evita loop infinito: só recarrega se não tiver recarregado nos últimos 10 segundos
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('lis_last_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError = 
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Importing a module script failed');

      return (
        <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-[#2D2D2D] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary border border-primary/20">
              <AlertTriangle size={32} />
            </div>

            <div>
              <h1 className="text-xl font-black text-white">
                {isChunkError ? 'Nova Versão do Sistema Disponível' : 'Ops, algo inesperado ocorreu'}
              </h1>
              <p className="text-xs text-white/60 mt-2 leading-relaxed">
                {isChunkError
                  ? 'Uma nova atualização foi implantada em produção. Clique no botão abaixo para carregar a versão mais recente.'
                  : (this.state.error?.message || 'Ocorreu um erro durante a renderização do módulo.')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="px-5 py-3 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                <RefreshCw size={16} /> Recarregar Sistema
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
              >
                <Home size={16} /> Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

