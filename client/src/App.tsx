import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { useSocketEvents } from './hooks/useSocketEvents';
import { Home } from './pages/Home';
import { HostView } from './pages/HostView';
import { ControllerView } from './pages/ControllerView';
import { Button } from './components/ui/Button';
import { Moon, Sun } from 'lucide-react';

function App() {
  useSocketEvents();
  const { role, isConnected, roomCode } = useStore();

  // Theme Toggle logic
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans transition-colors duration-300">
      {/* Header Flotante para Theme y Status */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {isConnected && <span className="bg-green-500/20 text-green-500 text-xs px-2 py-1 rounded-full border border-green-500/30">Conectado</span>}
        {roomCode && (
          <>
            <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full border border-primary/30">Sala: {roomCode}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                useStore.getState().logout();
                window.location.reload(); // Force reload to ensure clean socket state
              }}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs px-2 h-7"
            >
              Salir
            </Button>
          </>
        )}

        <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-8 h-8 p-0">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      {!role && <Home />}
      {role === 'host' && <HostView />}
      {role === 'controller' && <ControllerView />}
    </div>
  );
}

export default App;
