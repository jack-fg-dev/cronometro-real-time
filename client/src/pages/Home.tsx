import { socket } from '../lib/socket';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Clock, Users, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { setPendingPassword } from '../lib/pendingAuth';

export const Home = () => {
    const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleCreate = () => {
        if (!createPassword) return;
        setLoading(true);
        setErrorMsg('');
        // Guardar password pendiente para cuando el servidor confirme
        setPendingPassword(createPassword);
        socket.connect();
        socket.emit('room:create', { password: createPassword });
    };

    const handleJoin = () => {
        if (!code || !password) return;
        setLoading(true);
        setErrorMsg('');
        // Guardar password pendiente para cuando el servidor confirme
        setPendingPassword(password);
        socket.connect();
        socket.emit('room:join', { code: code.toUpperCase(), password });
    };

    // Exponer setters para que useSocketEvents pueda resetear el estado en caso de error
    (window as any).__homeSetLoading = setLoading;
    (window as any).__homeSetError = setErrorMsg;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark mb-8">
                Cronómetro Sync
            </h1>

            <Card className="w-full max-w-md p-6 space-y-6 shadow-xl border-t-4 border-primary">
                {mode === 'menu' && (
                    <div className="space-y-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full flex items-center gap-2"
                            onClick={() => setMode('create')}
                        >
                            <Clock className="w-5 h-5" />
                            Crear Sala (Host)
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            className="w-full flex items-center gap-2"
                            onClick={() => setMode('join')}
                        >
                            <Users className="w-5 h-5" />
                            Unirse a Sala
                        </Button>
                    </div>
                )}

                {mode === 'create' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Crear Nueva Sala</h2>
                        <Input
                            label="Contraseña de la Sala"
                            type="password"
                            placeholder="Ej. 1234"
                            value={createPassword}
                            onChange={(e) => setCreatePassword(e.target.value)}
                        />
                        {errorMsg && (
                            <p className="text-red-500 text-sm font-medium">{errorMsg}</p>
                        )}
                        <div className="flex gap-2 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={() => { setMode('menu'); setErrorMsg(''); }} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button variant="primary" className="flex-1" onClick={handleCreate} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
                            </Button>
                        </div>
                    </div>
                )}

                {mode === 'join' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Unirse a Sala</h2>
                        <Input
                            label="Código de Sala"
                            placeholder="Ej. A1B2"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                        />
                        <Input
                            label="Contraseña"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {errorMsg && (
                            <p className="text-red-500 text-sm font-medium">{errorMsg}</p>
                        )}
                        <div className="flex gap-2 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={() => { setMode('menu'); setErrorMsg(''); }} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button variant="primary" className="flex-1" onClick={handleJoin} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unirse'}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};
