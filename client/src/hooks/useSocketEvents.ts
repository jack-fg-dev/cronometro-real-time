import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { useStore } from '../store/useStore';
import { getPendingPassword, clearPendingPassword } from '../lib/pendingAuth';

export const useSocketEvents = () => {
    const {
        setConnected,
        updateTimer,
        addMessage,
        removeMessage,
        setRole,
        setRoom,
        setUsersCount,
        setHostStatus,
        logout,
    } = useStore();

    useEffect(() => {
        const onConnect = () => {
            console.log('Connected to server');
            setConnected(true);

            // Intento de reconexión automática SOLO si hay sala y contraseña guardadas
            const state = useStore.getState();
            if (state.roomCode && state.password) {
                console.log('Intentando reconexión automática a sala:', state.roomCode);
                socket.emit('room:join', {
                    code: state.roomCode,
                    password: state.password
                });
                // Pedir sincronización del timer tras reconectar
                socket.emit('timer:sync');
            }
        };

        const onDisconnect = () => {
            console.log('Disconnected');
            setConnected(false);
        };

        const onRoomCreated = (data: { roomId: string, code: string }) => {
            // La sala fue confirmada por el servidor — ahora sí guardamos en el store
            const pw = getPendingPassword();
            clearPendingPassword();
            setRoom(data.roomId, data.code, pw);

            // Resetear UI de Home si está montada
            const setLoading = (window as any).__homeSetLoading;
            if (setLoading) setLoading(false);
        };

        const onRoomJoined = (data: { roomId: string, code: string, timerConfig: any }) => {
            // La sala fue confirmada por el servidor — ahora sí guardamos en el store
            const pw = getPendingPassword();
            clearPendingPassword();
            setRoom(data.roomId, data.code, pw);

            // Resetear UI de Home si está montada
            const setLoading = (window as any).__homeSetLoading;
            if (setLoading) setLoading(false);
        };

        const onRoleUpdate = (data: { isHost: boolean, role?: 'host' | 'controller' }) => {
            console.log('[Socket] Role updated:', data.isHost ? 'Host' : 'Controller');
            setRole(data.isHost ? 'host' : 'controller');
            if (data.isHost) {
                setHostStatus('active');
            }
        };

        const onHostDisconnected = (data: { gracePeriod: number }) => {
            console.log('[Socket] Host disconnected, grace period:', data.gracePeriod);
            setHostStatus('disconnected', data.gracePeriod);
        };

        const onHostReconnected = () => {
            console.log('[Socket] Host reconnected');
            setHostStatus('active');
        };

        const onHostChanged = (data: { hostUserId: string }) => {
            console.log('[Socket] Host changed to:', data.hostUserId);
            const localUserId = localStorage.getItem('cronometro_userId');
            if (localUserId && data.hostUserId === localUserId) {
                console.log('[Socket] Este cliente fue promovido a Host');
                setRole('host');
            }
            setHostStatus('active');
        };

        const onUsersCount = (data: { count: number }) => {
            console.log('[Socket] Users count updated:', data.count);
            setUsersCount(data.count);
        };

        const onTimerUpdate = (data: any) => {
            updateTimer({
                value: data.value,
                running: data.running,
                // Usamos el timestamp del SERVIDOR para que todos los clientes
                // interpolacen desde el mismo punto de referencia.
                lastActionTime: data.timestamp ?? Date.now()
            });
        };

        const onTimerConfig = (data: any) => {
            updateTimer({ type: data.type, initialTime: data.initialTime });
        };

        const onMessageNew = (data: any) => {
            addMessage(data);
        };

        const onMessageDeleted = (data: { messageId: string }) => {
            removeMessage(data.messageId);
        };

        const onError = (data: { message: string }) => {
            console.error('Socket Error:', data.message);

            // Si el error es de sala inválida (no existe o contraseña mal),
            // limpiar el store para que el usuario vuelva a Home y no quede en limbo
            const roomErrors = ['Room not found', 'Invalid password', 'Password required', 'Error joining room'];
            if (roomErrors.some(e => data.message.includes(e))) {
                console.warn('[Socket] Room error — limpiando store y volviendo a Home');
                logout();

                // Notificar a la UI de Home si está montada
                const setLoading = (window as any).__homeSetLoading;
                const setError = (window as any).__homeSetError;
                if (setLoading) setLoading(false);
                if (setError) setError(data.message === 'Room not found' ? 'Sala no encontrada'
                    : data.message === 'Invalid password' ? 'Contraseña incorrecta'
                        : data.message);
            }
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('room:created', onRoomCreated);
        socket.on('room:joined', onRoomJoined);
        socket.on('room:role_update', onRoleUpdate);
        socket.on('room:host_disconnected', onHostDisconnected);
        socket.on('room:host_reconnected', onHostReconnected);
        socket.on('room:host_changed', onHostChanged);
        socket.on('room:users_count', onUsersCount);
        socket.on('timer:update', onTimerUpdate);
        socket.on('timer:config', onTimerConfig);
        socket.on('message:new', onMessageNew);
        socket.on('message:deleted', onMessageDeleted);
        socket.on('error', onError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('room:created', onRoomCreated);
            socket.off('room:joined', onRoomJoined);
            socket.off('room:role_update', onRoleUpdate);
            socket.off('room:host_disconnected', onHostDisconnected);
            socket.off('room:host_reconnected', onHostReconnected);
            socket.off('room:host_changed', onHostChanged);
            socket.off('room:users_count', onUsersCount);
            socket.off('timer:update', onTimerUpdate);
            socket.off('timer:config', onTimerConfig);
            socket.off('message:new', onMessageNew);
            socket.off('message:deleted', onMessageDeleted);
            socket.off('error', onError);
        };
    }, [
        setConnected,
        updateTimer,
        addMessage,
        removeMessage,
        setRole,
        setRoom,
        setUsersCount,
        setHostStatus,
        logout,
    ]);

    // Effect to check for reconnection on mount
    useEffect(() => {
        const state = useStore.getState();
        if (state.roomCode && !socket.connected) {
            console.log('Restoring connection for existing session...');
            socket.connect();
        }
    }, []);

    // Cuando la pestaña vuelve a estar visible, pedir sincronización al servidor
    // para corregir cualquier drift acumulado mientras el tab estaba en background.
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible' && socket.connected) {
                const state = useStore.getState();
                if (state.roomCode) {
                    console.log('[Visibility] Tab visible de nuevo — solicitando timer:sync');
                    socket.emit('timer:sync');
                }
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);
};
