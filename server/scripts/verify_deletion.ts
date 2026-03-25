
import { io } from "socket.io-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SERVER_URL = "http://localhost:3000";

async function verifyDeletion() {
    console.log("Starting verification...");

    // 1. Connect and Create Room
    const socket = io(SERVER_URL);

    const roomPassword = "testpassword";
    let roomCode = "";
    let roomId = "";

    await new Promise<void>((resolve, reject) => {
        socket.on("connect", () => {
            console.log("Connected to server");
            socket.emit("room:create", { password: roomPassword });
        });

        socket.on("room:created", (data) => {
            console.log("Room created:", data);
            roomCode = data.code;
            roomId = data.roomId;
            resolve();
        });

        socket.on("error", (err) => {
            console.error("Socket error:", err);
            reject(err);
        });
    });

    // Verify room exists in DB
    const roomBefore = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!roomBefore) {
        console.error("TEST FAILED: Room not found in DB after creation");
        process.exit(1);
    }
    console.log("Room verified in DB.");

    // 2. Disconnect
    console.log("Disconnecting socket...");
    socket.disconnect();

    // 3. Wait for grace period (20s + buffer)
    console.log("Waiting for grace period (25s)...");
    await new Promise(resolve => setTimeout(resolve, 25000));

    // 4. Verify room is gone
    const roomAfter = await prisma.room.findUnique({ where: { code: roomCode } });
    if (roomAfter) {
        console.error("TEST FAILED: Room still exists in DB after grace period");
        process.exit(1);
    } else {
        console.log("TEST PASSED: Room successfully deleted from DB.");
    }

    process.exit(0);
}

verifyDeletion().catch(console.error);
