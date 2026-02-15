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

export default router;
