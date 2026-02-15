import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authGuard } from '../middleware/auth.middleware';

const router = Router();

// Define custom interface for Request with User attached
interface AuthRequest extends Request {
    user?: {
        userId: number;
        email: string;
        role: string;
    };
}

// 1. Create a Project
router.post('/', authGuard, async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const project = await prisma.project.create({
            data: {
                name,
                adminId: userId
            }
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create Project Error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// 2. Get All Projects for User (Admin or Member)
// Note: Current schema only links Admin to Project.
// Ideally, we'd have a Members relation. For now, we'll return projects created by user.
router.get('/', authGuard, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        const projects = await prisma.project.findMany({
            where: {
                adminId: userId
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        res.json(projects);
    } catch (error) {
        console.error('Get Projects Error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// 3. Get Project Details & Messages
router.get(
    '/:id/messages',
    authGuard,
    async (req: AuthRequest, res: Response) => {
        try {
            const projectId = parseInt(req.params.id as string);

            if (isNaN(projectId)) {
                return res.status(400).json({ error: 'Invalid project ID' });
            }

            const messages = await prisma.message.findMany({
                where: {
                    projectId
                },
                include: {
                    sender: {
                        select: {
                            user_id: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'asc' // Oldest first for chat history
                }
            });

            res.json(messages);
        } catch (error) {
            console.error('Get Messages Error:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    }
);

// 4. Send Message (HTTP fallback for Socket.IO)
router.post(
    '/:id/messages',
    authGuard,
    async (req: AuthRequest, res: Response) => {
        try {
            const projectId = parseInt(req.params.id as string);
            const { content } = req.body;
            const userId = req.user?.userId;

            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            if (isNaN(projectId))
                return res.status(400).json({ error: 'Invalid project ID' });
            if (!content)
                return res
                    .status(400)
                    .json({ error: 'Message content is required' });

            const message = await prisma.message.create({
                data: {
                    content,
                    projectId,
                    senderId: userId
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

            res.status(201).json(message);
        } catch (error) {
            console.error('Send Message Error:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    }
);

export default router;
