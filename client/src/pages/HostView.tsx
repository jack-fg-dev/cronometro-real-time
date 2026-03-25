import { useState } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../lib/socket';
import { TimerDisplay } from '../components/TimerDisplay';
import { Button } from '../components/ui/Button';
import { Play, Pause, RotateCcw, Settings, X, Users, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

export const HostView = () => {
    const { timer, roomCode, messages, usersCount, isConnected } = useStore();
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState(1); // 1 = 100%

    const handleStart = () => socket.emit('timer:start');
    const handlePause = () => socket.emit('timer:pause');
    const handleReset = () => socket.emit('timer:reset');
    const handleDeleteMessage = (id: string) => socket.emit('message:delete', { messageId: id });

    return (
        <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-4 left-4 text-text-secondary-light dark:text-text-secondary-dark font-medium z-10 flex flex-col gap-1">
                <div>
                    Host / Sala: <span className="text-primary font-bold">{roomCode}</span>
                </div>
                <div className="flex items-center gap-2 text-sm opacity-80">
                    <Users className="w-4 h-4" />
                    <span>{usersCount} conectados</span>
                </div>
                {!isConnected && (
                    <div className="flex items-center gap-2 text-red-500 font-bold animate-pulse">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Desconectado</span>
                    </div>
                )}
            </div>

            {/* Area Principal - Flexible para compartir pantalla */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[90vw] transition-all duration-300" style={{ transform: `scale(${fontSize})` }}>
                <div className="mb-4 sm:mb-12 transition-all duration-500">
                    <TimerDisplay size="lg" />
                </div>

                <div className="flex gap-4 sm:gap-6 z-10">
                    {!timer.running ? (
                        <Button size="lg" className="w-20 h-20 sm:w-32 sm:h-32 rounded-full text-2xl" onClick={handleStart} disabled={!isConnected}>
                            <Play className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
                        </Button>
                    ) : (
                        <Button size="lg" variant="outline" className="w-20 h-20 sm:w-32 sm:h-32 rounded-full text-2xl border-4" onClick={handlePause} disabled={!isConnected}>
                            <Pause className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
                        </Button>
                    )}

                    <Button size="lg" variant="ghost" className="w-16 h-16 sm:w-24 sm:h-24 rounded-full" onClick={handleReset} disabled={!isConnected}>
                        <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
                    </Button>
                    <Button size="lg" variant="ghost" className="w-16 h-16 sm:w-24 sm:h-24 rounded-full" onClick={() => setShowSettings(!showSettings)}>
                        <Settings className="w-6 h-6 sm:w-8 sm:h-8" />
                    </Button>
                </div>
            </div>

            {/* Panel de Configuración */}
            {showSettings && (
                <div className="absolute top-20 right-4 bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-xl border border-border-light dark:border-border-dark z-50 w-64 animate-in slide-in-from-right-5">
                    <h3 className="font-bold mb-4 text-text-primary-light dark:text-text-primary-dark">Configuración</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2 block">Tamaño Cronómetro</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={fontSize}
                                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Mensajes Recientes - Estilo Completo */}
            <div className="mt-8 sm:mt-12 w-full max-w-2xl space-y-2 px-4">
                {messages.map((msg) => (
                    <Card key={msg.id} className={cn(
                        "p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300 shadow-md",
                        msg.priority === 'urgent' ? "bg-red-500 text-white" :
                            msg.priority === 'warning' ? "bg-orange-500 text-white" :
                                "bg-surface-light dark:bg-surface-dark border-l-4 border-l-primary"
                    )}>
                        <span className={cn("font-medium text-lg", msg.priority !== 'info' ? "text-white" : "text-text-primary-light dark:text-text-primary-dark")}>
                            {msg.content}
                        </span>

                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "text-xs px-2 py-1 rounded-full uppercase font-bold",
                                msg.priority === 'urgent' ? "bg-white/20 text-white" :
                                    msg.priority === 'warning' ? "bg-white/20 text-white" :
                                        "bg-gray-100 text-gray-600"
                            )}>
                                {msg.priority}
                            </span>
                            <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-2 hover:bg-black/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

