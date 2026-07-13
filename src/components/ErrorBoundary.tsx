import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
          <AlertTriangle size={48} className="text-red-500" />
          <div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Algo deu errado neste módulo</h2>
            <p className="text-white/60 text-sm max-w-md mx-auto">
              {this.props.fallbackMessage || 'Ocorreu um erro inesperado ao renderizar este componente.'}
            </p>
            {this.state.error && (
              <div className="mt-4 p-4 bg-black/40 rounded-lg text-left overflow-x-auto">
                <code className="text-xs text-red-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-red-500/20 text-red-400 font-bold rounded-lg hover:bg-red-500/30 transition-colors mt-4"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
