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
    body: any;
    params: any;
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

        // Auto-add the creator as a project member
        await prisma.projectMember.create({
            data: {
                userId,
                projectId: project.id
            }
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create Project Error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// 2. Get All Projects for User (Admin or Member)
router.get('/', authGuard, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { adminId: userId },
                    { projectMembers: { some: { userId } } }
                ]
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

            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            if (isNaN(projectId)) {
                return res.status(400).json({ error: 'Invalid project ID' });
            }

            // Check membership
            const isMember = await prisma.projectMember.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });
            const isAdmin = await prisma.project.findFirst({
                where: { id: projectId, adminId: userId }
            });
            if (!isMember && !isAdmin) {
                return res
                    .status(403)
                    .json({ error: 'You are not a member of this project' });
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
                    createdAt: 'asc'
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

            // Check membership
            const isMember = await prisma.projectMember.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });
            const isAdmin = await prisma.project.findFirst({
                where: { id: projectId, adminId: userId }
            });
            if (!isMember && !isAdmin) {
                return res
                    .status(403)
                    .json({ error: 'You are not a member of this project' });
            }

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
