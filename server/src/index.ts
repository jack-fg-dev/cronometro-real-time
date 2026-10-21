import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { roomHandler } from './handlers/roomHandler';
import { timerHandler } from './handlers/timerHandler';
import { messageHandler } from './handlers/messageHandler';
import RoomManager from './utils/roomManager';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const CLIENT_URL = process.env.CLIENT_URL;

// Allowed origins: prefer explicit CLIENT_URL; fall back to localhost in dev or allow all if not set yet
const allowedOrigins = CLIENT_URL && CLIENT_URL !== '*' ? [CLIENT_URL] : [
    'http://localhost:5173',
    'http://localhost:3000'
];

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            // allow if no origin (health checks, server-to-server) or CLIENT_URL is not configured / is wildcard
            if (!origin || !CLIENT_URL || CLIENT_URL === '*') return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

const roomManager = new RoomManager(io);

// Strict CORS: allow frontend origin (or all if not configured yet)
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || !CLIENT_URL || CLIENT_URL === '*') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Lógica de Sockets
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    roomHandler(io, socket, roomManager);
    timerHandler(io, socket, roomManager);
    messageHandler(io, socket);

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        roomManager.handleSocketDisconnect(socket.id);
    });
});

const PORT = process.env.PORT || 3000;

// Aviso si CLIENT_URL no está configurada aún en producción
if (process.env.NODE_ENV === 'production' && !CLIENT_URL) {
    console.warn('[Startup] Advertencia: CLIENT_URL no está definida aún. Se aceptarán conexiones hasta configurar la URL de Vercel.');
}

// Al iniciar, limpiar todas las salas en DB porque el servidor arrancó fresco
// (RoomManager vacío = no hay usuarios activos en ninguna sala)
async function startServer() {
    try {
        const deleted = await prisma.room.deleteMany({});
        console.log(`[Startup] Limpiadas ${deleted.count} sala(s) de sesiones anteriores de la BD.`);
    } catch (err) {
        console.error('[Startup] Error limpiando salas viejas:', err);
    }

    httpServer.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

startServer();

