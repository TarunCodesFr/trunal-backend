import { Router } from 'express';
import { register, login } from '../controller/auth.controller';
import { authGuard } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/me', authGuard, async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Get all users (admin-only) — for member assignment in admin portal
router.get('/users', authGuard, async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const requestingUser = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { role: true }
        });
        if (!requestingUser || requestingUser.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await prisma.user.findMany({
            select: {
                user_id: true,
                email: true,
                username: true,
                role: true
            },
            orderBy: { username: 'asc' }
        });

        res.json(users);
    } catch {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;
