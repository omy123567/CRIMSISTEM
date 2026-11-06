import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error no capturado en la aplicación:', error, errorInfo);
  }

  private handleReset = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 bg-red-900/50 border border-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-red-300 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-red-200 mb-2">
            Se ha producido una contingencia en el Sistema Policial
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Ocurrió un error al cargar la vista ({this.state.error?.message || 'Error desconocido'}).
            Haga clic a continuación para restablecer la sesión y acceder normalmente.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Recargar Página
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-lg"
            >
              Restablecer Sesión y Entrar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
