import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../lib/socket';
import { TimerDisplay } from '../components/TimerDisplay';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Play, Pause, RotateCcw, Send, AlertTriangle, Info, AlertOctagon, X, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '@/lib/utils'; // Keep this import

export const ControllerView = () => {
    const { timer, messages, hostStatus, gracePeriodEnd, usersCount } = useStore();

    // Debug render state
    console.log('[ControllerView] Render:', {
        usersCount,
        hostStatus,
        timerRunning: timer.running,
        timerValue: timer.value
    });

    const [msg, setMsg] = useState('');
    const [priority, setPriority] = useState('info');
    const [timeLeft, setTimeLeft] = useState(0);

    // Countdown effect for grace period
    useEffect(() => {
        if (hostStatus === 'disconnected' && gracePeriodEnd) {
            // Initial calculation
            const calcTimeLeft = () => Math.max(0, Math.ceil((gracePeriodEnd - Date.now()) / 1000));
            setTimeLeft(calcTimeLeft());

            const interval = setInterval(() => {
                const diff = calcTimeLeft();
                setTimeLeft(diff);
                if (diff <= 0) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimeLeft(0);
        }
    }, [hostStatus, gracePeriodEnd]);

    const handleStart = () => socket.emit('timer:start');
    const handlePause = () => socket.emit('timer:pause');
    const handleReset = () => socket.emit('timer:reset');
    const handleDeleteMessage = (id: string) => socket.emit('message:delete', { messageId: id });

    const handleSend = () => {
        if (!msg.trim()) return;
        socket.emit('message:send', { content: msg, priority });
        setMsg('');
    };

    return (
        <div className="min-h-screen p-4 flex flex-col gap-6 max-w-md mx-auto relative">
            <div className="flex justify-between items-center text-text-secondary-light dark:text-text-secondary-dark">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{usersCount}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full",
                        hostStatus === 'active' ? "bg-green-500" : "bg-red-500 animate-pulse"
                    )} />
                    <span className="text-xs uppercase tracking-wider font-bold">
                        {hostStatus === 'active' ? 'Conectado' : 'Sin Host'}
                    </span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center min-h-[30vh]">
                <TimerDisplay size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {!timer.running ? (
                    <Button onClick={handleStart} variant="primary" className="h-16 rounded-2xl">
                        <Play className="w-8 h-8" fill="currentColor" />
                    </Button>
                ) : (
                    <Button onClick={handlePause} variant="secondary" className="h-16 rounded-2xl">
                        <Pause className="w-8 h-8" fill="currentColor" />
                    </Button>
                )}
                <Button onClick={handleReset} variant="outline" className="h-16 rounded-2xl">
                    <RotateCcw className="w-8 h-8" />
                </Button>
            </div>

            <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                    <button
                        onClick={() => setPriority('info')}
                        className={cn("flex-1 py-2 rounded-lg transition-all flex justify-center", priority === 'info' ? "bg-primary text-white shadow-sm" : "hover:bg-black/5")}
                    ><Info className="w-5 h-5" /></button>
                    <button
                        onClick={() => setPriority('warning')}
                        className={cn("flex-1 py-2 rounded-lg transition-all flex justify-center", priority === 'warning' ? "bg-orange-500 text-white shadow-sm" : "hover:bg-black/5")}
                    ><AlertTriangle className="w-5 h-5" /></button>
                    <button
                        onClick={() => setPriority('urgent')}
                        className={cn("flex-1 py-2 rounded-lg transition-all flex justify-center", priority === 'urgent' ? "bg-red-500 text-white shadow-sm" : "hover:bg-black/5")}
                    ><AlertOctagon className="w-5 h-5" /></button>
                </div>

                <div className="flex gap-2">
                    <Input
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        placeholder="Enviar mensaje..."
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <Button onClick={handleSend} disabled={!msg.trim()}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Lista de Mensajes también en Controlador para ver lo que hay */}
            <div className="space-y-2 pb-8">
                {messages.map((msg) => (
                    <Card key={msg.id} className={cn(
                        "p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300 shadow-sm",
                        msg.priority === 'urgent' ? "bg-red-500 text-white" :
                            msg.priority === 'warning' ? "bg-orange-500 text-white" :
                                "bg-surface-light dark:bg-surface-dark border-l-4 border-l-primary"
                    )}>
                        <span className={cn("font-medium", msg.priority !== 'info' ? "text-white" : "text-text-primary-light dark:text-text-primary-dark")}>
                            {msg.content}
                        </span>
                        <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-2 hover:bg-black/10 rounded-full transition-colors text-current"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </Card>
                ))}
            </div>

            {/* Host Disconnected Overlay - Render always, toggle visibility */}
            <div className={cn(
                "fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm transition-all duration-300",
                hostStatus === 'disconnected' ? "opacity-100 pointer-events-auto visible" : "opacity-0 pointer-events-none invisible"
            )}>
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold mb-2">Host Desconectado</h2>
                <p className="text-gray-300 mb-4 text-center px-4">
                    Esperando reconexión del host...
                </p>
                <div className="text-4xl font-mono font-bold text-primary">
                    {gracePeriodEnd ? timeLeft : 0}s
                </div>
                <p className="text-sm text-gray-500 mt-4">
                    Se asignará un nuevo host si no regresa.
                </p>
            </div>
        </div>
    );
};
