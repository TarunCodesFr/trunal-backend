"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("./app"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const PORT = process.env.PORT || 4001;
const server = http_1.default.createServer(app_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: [
            'http://localhost:3000',
            'http://192.168.1.1:3000',
            process.env.FRONTEND_URL || ''
        ].filter(Boolean),
        methods: ['GET', 'POST'],
        credentials: true
    }
});
// Socket Authentication Middleware
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.userId) {
            return next(new Error('Authentication error: Invalid token payload'));
        }
        socket.data.userId = decoded.userId;
        next();
    }
    catch (err) {
        console.error('Socket auth error:', err);
        next(new Error('Authentication error: Invalid or expired token'));
    }
});
// Socket Events
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id} (User ID: ${socket.data.userId})`);
    // 1️⃣ Confirm Authentication
    socket.emit('authenticated', {
        userId: socket.data.userId
    });
    // 2️⃣ Join Project Room
    socket.on('join_project', async ({ projectId }) => {
        // Validation
        if (!projectId || typeof projectId !== 'number') {
            socket.emit('error_message', 'Invalid Project ID');
            return;
        }
        // Ideally check if user has access to this project here
        // const hasAccess = await checkProjectAccess(socket.data.userId, projectId);
        // if (!hasAccess) return socket.emit('error_message', 'Forbidden');
        const room = `project_${projectId}`;
        socket.join(room);
        console.log(`User ${socket.data.userId} joined ${room}`);
        socket.emit('joined_project', { projectId });
    });
    // 3️⃣ Send Message Event
    socket.on('send_message', async ({ projectId, content }) => {
        try {
            // Validation
            if (!projectId || typeof projectId !== 'number') {
                return socket.emit('error_message', 'Invalid Project ID');
            }
            if (!content ||
                typeof content !== 'string' ||
                content.trim().length === 0) {
                return socket.emit('error_message', 'Message content cannot be empty');
            }
            const userId = socket.data.userId;
            // Save message to DB
            const message = await prisma_1.default.message.create({
                data: {
                    content,
                    senderId: userId,
                    projectId
                },
                include: {
                    sender: {
                        select: {
                            user_id: true,
                            username: true
                        }
                    }
                }
            });
            // Broadcast message to project room (including sender)
            io.to(`project_${projectId}`).emit('new_message', message);
        }
        catch (err) {
            console.error('Message error:', err);
            socket.emit('error_message', 'Failed to send message');
        }
    });
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});
// Start Server
server.listen(PORT, () => {
    console.log(`Backend and Socket.IO running on http://localhost:${PORT}`);
});
