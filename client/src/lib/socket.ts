import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// En desarrollo, el servidor está en localhost:3000
// En producción, debería ser la URL del deploy.
const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

// Generar userId persistente
const getUserId = () => {
    let userId = localStorage.getItem('cronometro_userId');
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem('cronometro_userId', userId);
    }
    console.log('[Socket] Initializing with UserId:', userId);
    return userId;
};

export const socket = io(URL, {
    autoConnect: false,
    auth: {
        userId: getUserId(),
    }
});
