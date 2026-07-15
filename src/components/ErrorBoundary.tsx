import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
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
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 space-y-4 max-w-lg mx-auto my-8 text-center animate-in fade-in">
          <div className="flex justify-center text-red-500">
            <ShieldAlert size={48} />
          </div>
          <h3 className="text-lg font-bold text-white">Ops! Algo deu errado neste módulo</h3>
          <p className="text-xs text-white/60">
            {this.props.fallbackMessage || 'Ocorreu um erro inesperado ao carregar esta seção do sistema.'}
          </p>
          {this.state.error && (
            <pre className="bg-black/30 p-4 rounded-xl text-[10px] text-red-400 font-mono text-left max-h-40 overflow-y-auto whitespace-pre-wrap">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-2 px-6 rounded-xl text-xs transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
