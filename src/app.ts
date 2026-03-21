// libs
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma';
import { authGuard } from './middleware/auth.middleware';

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.1.1:3000',
    'https://trunal.in',
    'http://trunal.in'
].filter(Boolean);

// Add environment variable if it exists and is not already in the list
if (
    process.env.FRONTEND_URL &&
    !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
    cors({
        origin: (origin, callback) => {
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
        credentials: true,
        optionsSuccessStatus: 200 // Some legacy browsers choke on 204
    })
);

app.use(express.json());

// routes AFTER middleware
import authRoutes from './routes/auth.route';
import projectRoutes from './routes/project.route';
import projectMemberRoutes from './routes/projectMember.route';
import seedRoutes from './routes/seed.route';

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/members', projectMemberRoutes);
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
