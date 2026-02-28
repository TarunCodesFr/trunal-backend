import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authGuard } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });

interface AuthRequest extends Request {
    user?: {
        userId: number;
        email: string;
        role: string;
    };
    body: any;
    params: any;
}

// Helper: check if requesting user is the project admin
async function isProjectAdmin(
    projectId: number,
    userId: number
): Promise<boolean> {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });
    return project?.adminId === userId;
}

// 1. Add a member to a project (admin-only)
router.post('/', authGuard, async (req: AuthRequest, res: Response) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const { userId: targetUserId } = req.body;
        const requesterId = req.user?.userId;

        if (!requesterId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (isNaN(projectId))
            return res.status(400).json({ error: 'Invalid project ID' });
        if (!targetUserId || typeof targetUserId !== 'number') {
            return res
                .status(400)
                .json({ error: 'userId is required and must be a number' });
        }

        // Only the project admin can add members
        if (!(await isProjectAdmin(projectId, requesterId))) {
            return res
                .status(403)
                .json({ error: 'Only the project admin can add members' });
        }

        // Check if user exists
        const userExists = await prisma.user.findUnique({
            where: { user_id: targetUserId }
        });
        if (!userExists)
            return res.status(404).json({ error: 'User not found' });

        // Create membership (unique constraint will catch duplicates)
        const member = await prisma.projectMember.create({
            data: {
                userId: targetUserId,
                projectId
            },
            include: {
                user: {
                    select: { user_id: true, username: true, email: true }
                }
            }
        });

        res.status(201).json(member);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return res
                .status(409)
                .json({ error: 'User is already a member of this project' });
        }
        console.error('Add Member Error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// 2. Remove a member from a project (admin-only)
router.delete(
    '/:userId',
    authGuard,
    async (req: AuthRequest, res: Response) => {
        try {
            const projectId = parseInt(req.params.projectId);
            const targetUserId = parseInt(req.params.userId);
            const requesterId = req.user?.userId;

            if (!requesterId)
                return res.status(401).json({ error: 'Unauthorized' });
            if (isNaN(projectId))
                return res.status(400).json({ error: 'Invalid project ID' });
            if (isNaN(targetUserId))
                return res.status(400).json({ error: 'Invalid user ID' });

            // Only the project admin can remove members
            if (!(await isProjectAdmin(projectId, requesterId))) {
                return res
                    .status(403)
                    .json({
                        error: 'Only the project admin can remove members'
                    });
            }

            // Prevent admin from removing themselves
            if (targetUserId === requesterId) {
                return res
                    .status(400)
                    .json({
                        error: 'Admin cannot remove themselves from the project'
                    });
            }

            await prisma.projectMember.delete({
                where: {
                    userId_projectId: {
                        userId: targetUserId,
                        projectId
                    }
                }
            });

            res.json({ message: 'Member removed successfully' });
        } catch (error: any) {
            if (error?.code === 'P2025') {
                return res
                    .status(404)
                    .json({ error: 'Member not found in this project' });
            }
            console.error('Remove Member Error:', error);
            res.status(500).json({ error: 'Failed to remove member' });
        }
    }
);

// 3. List all members of a project
router.get('/', authGuard, async (req: AuthRequest, res: Response) => {
    try {
        const projectId = parseInt(req.params.projectId);

        if (isNaN(projectId))
            return res.status(400).json({ error: 'Invalid project ID' });

        const members = await prisma.projectMember.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { user_id: true, username: true, email: true }
                }
            },
            orderBy: { joinedAt: 'asc' }
        });

        res.json(members);
    } catch (error) {
        console.error('List Members Error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

export default router;
