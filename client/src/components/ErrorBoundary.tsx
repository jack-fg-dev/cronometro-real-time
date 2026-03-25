import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
    children?: ReactNode;
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
        console.error('Uncaught error:', error, errorInfo);
        console.error('Component Stack:', errorInfo.componentStack);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Algo salió mal</h1>
                    <div className="bg-black/50 p-4 rounded text-sm text-gray-300 max-w-full overflow-auto mb-4 w-full">
                        <p className="font-bold text-red-400 mb-2">{this.state.error?.message}</p>
                        <pre className="text-xs opacity-70 whitespace-pre-wrap">
                            {this.state.error?.stack}
                        </pre>
                    </div>
                    <Button onClick={() => window.location.reload()}>
                        Recargar Página
                    </Button>
                    <Button variant="outline" className="mt-2" onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}>
                        Borrar Datos y Recargar
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
