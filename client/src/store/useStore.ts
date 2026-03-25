import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
    id: string;
    content: string;
    priority: string; // 'info' | 'warning' | 'urgent'
    createdAt: string;
}

interface TimerState {
    value: number; // Tiempo acumulado en ms (del servidor)
    running: boolean;
    type: 'stopwatch' | 'countdown';
    initialTime: number;
    lastActionTime: number; // Timestamp del servidor cuando ocurrió el último evento
}

interface AppState {
    isConnected: boolean;
    role: 'host' | 'controller' | null;
    roomId: string | null;
    roomCode: string | null;
    password?: string; // Para reconexión

    // New State for Host Management
    usersCount: number;
    hostStatus: 'active' | 'disconnected';
    gracePeriodEnd: number | null; // Timestamp when grace period ends

    timer: TimerState;
    messages: Message[];

    setConnected: (connected: boolean) => void;
    setRole: (role: 'host' | 'controller' | null) => void;
    setRoom: (roomId: string, roomCode: string, password?: string) => void;

    setUsersCount: (count: number) => void;
    setHostStatus: (status: 'active' | 'disconnected', gracePeriodMs?: number) => void;

    updateTimer: (data: Partial<TimerState>) => void;
    addMessage: (msg: Message) => void;
    removeMessage: (id: string) => void;
    setMessages: (msgs: Message[]) => void;
    logout: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            isConnected: false,
            role: null,
            roomId: null,
            roomCode: null,
            password: undefined,

            usersCount: 0,
            hostStatus: 'active',
            gracePeriodEnd: null,

            timer: {
                value: 0,
                running: false,
                type: 'stopwatch',
                initialTime: 0,
                lastActionTime: Date.now()
            },
            messages: [],

            setConnected: (connected) => set({ isConnected: connected }),

            setRole: (role) => set({ role }),
            setRoom: (roomId, roomCode, password) => set((state) => ({
                roomId,
                roomCode,
                password: password ?? state.password
            })),

            setUsersCount: (count) => set({ usersCount: count }),
            setHostStatus: (status, gracePeriodMs) => set(() => ({
                hostStatus: status,
                gracePeriodEnd: status === 'disconnected' && gracePeriodMs ? Date.now() + gracePeriodMs : null
            })),

            updateTimer: (data) => set((state) => ({
                timer: { ...state.timer, ...data }
            })),

            addMessage: (msg) => set((state) => ({
                messages: [msg, ...state.messages]
            })),

            removeMessage: (id) => set((state) => ({
                messages: state.messages.filter((m) => m.id !== id)
            })),

            setMessages: (msgs) => set({ messages: msgs }),

            logout: () => set({
                role: null,
                roomId: null,
                roomCode: null,
                password: undefined,
                isConnected: false,
                messages: [],
                usersCount: 0,
            }),
        }),
        {
            name: 'cronometro-storage', // key en localStorage
            partialize: (state) => ({
                // NO persistimos role: cada vez que abre la app debe re-validar con el servidor
                roomCode: state.roomCode,
                password: state.password
            }),
        }
    )
);
