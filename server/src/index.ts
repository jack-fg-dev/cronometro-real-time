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

// Allowed origins: prefer explicit CLIENT_URL; fall back to common localhost origins for dev
const allowedOrigins = CLIENT_URL ? [CLIENT_URL] : [
    'http://localhost:5173',
    'http://localhost:3000'
];

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            // allow non-browser clients (no origin) or allowedOrigins
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

const roomManager = new RoomManager(io);

// Strict CORS: only allow configured frontend origin (or localhost in dev)
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
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

// If running in production require CLIENT_URL to be set so only your frontend can connect
if (process.env.NODE_ENV === 'production' && !CLIENT_URL) {
    console.error('[Startup] CLIENT_URL must be set in production to restrict allowed origins. Exiting.');
    process.exit(1);
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

