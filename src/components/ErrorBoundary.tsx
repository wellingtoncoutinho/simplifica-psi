import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#181615] text-[#faf8f5] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#211e1d] border border-[#8da693]/20 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <AlertTriangle size={30} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#faf8f5]">Ops! Algo não carregou corretamente</h2>
              <p className="text-xs text-[#a8a19c] leading-relaxed">
                Detectamos uma instabilidade temporária na interface. Seus dados e prontuários estão 100% seguros na nuvem.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-[10px] text-red-400 font-mono text-left max-h-24 overflow-y-auto select-all">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3.5 px-6 bg-[#8da693] hover:bg-[#748b7a] text-[#181615] rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#8da693]/20 cursor-pointer"
            >
              <RefreshCw size={14} />
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
