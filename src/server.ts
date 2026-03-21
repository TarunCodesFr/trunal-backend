import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app';
import prisma from './lib/prisma';

const PORT = process.env.PORT || 4001;

// Define interfaces for type safety
interface ServerToClientEvents {
    authenticated: (payload: { userId: number }) => void;
    joined_project: (payload: { projectId: number }) => void;
    new_message: (payload: {
        id: number;
        content: string;
        senderId: number;
        projectId: number;
        createdAt: Date;
        sender: {
            user_id: number;
            username: string;
        };
    }) => void;
    error_message: (message: string) => void;
}

interface ClientToServerEvents {
    join_project: (payload: { projectId: number }) => void;
    send_message: (payload: { projectId: number; content: string }) => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketData {
    userId: number;
}

const server = http.createServer(app);

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:3000',
                'http://192.168.1.1:3000',
                process.env.FRONTEND_URL || ''
            ].filter(Boolean);
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            const trunalDomainRegex =
                /^https?:\/\/([a-zA-Z0-9-]+\.)*trunal\.in(:[0-9]+)?$/;
            if (trunalDomainRegex.test(origin)) {
                return callback(null, true);
            }

            if (origin.endsWith('.vercel.app')) {
                return callback(null, true);
            }

            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        },
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: number;
        };

        if (!decoded || !decoded.userId) {
            return next(
                new Error('Authentication error: Invalid token payload')
            );
        }

        socket.data.userId = decoded.userId;
        next();
    } catch (err) {
        console.error('Socket auth error:', err);
        next(new Error('Authentication error: Invalid or expired token'));
    }
});

// Socket Events
io.on('connection', (socket) => {
    console.log(
        `User connected: ${socket.id} (User ID: ${socket.data.userId})`
    );

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

        // Check if user is a member or admin of this project
        const userId = socket.data.userId;
        const isMember = await prisma.projectMember.findUnique({
            where: { userId_projectId: { userId, projectId } }
        });
        const isAdmin = await prisma.project.findFirst({
            where: { id: projectId, adminId: userId }
        });
        if (!isMember && !isAdmin) {
            socket.emit(
                'error_message',
                'You are not a member of this project'
            );
            return;
        }

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
            if (
                !content ||
                typeof content !== 'string' ||
                content.trim().length === 0
            ) {
                return socket.emit(
                    'error_message',
                    'Message content cannot be empty'
                );
            }

            const userId = socket.data.userId;

            // Save message to DB
            const message = await prisma.message.create({
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
        } catch (err) {
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
