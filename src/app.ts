// libs
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma';
import { authGuard } from './middleware/auth.middleware';

const app = express();

app.use(
    cors({
        origin: ['http://localhost:3000', 'http://192.168.1.1:3000'],
        credentials: true
    })
);

app.use(express.json());

// routes AFTER middleware
import authRoutes from './routes/auth.route';
import projectRoutes from './routes/project.route';
import seedRoutes from './routes/seed.route';

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/seed', seedRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.get('/test-db', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                user_id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });

        res.json(users);
    } catch (error) {
        console.error('DB Test Error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

export default app;
