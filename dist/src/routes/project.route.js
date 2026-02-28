"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// 1. Create a Project
router.post('/', auth_middleware_1.authGuard, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }
        const project = await prisma_1.default.project.create({
            data: {
                name,
                adminId: userId
            }
        });
        // Auto-add the creator as a project member
        await prisma_1.default.projectMember.create({
            data: {
                userId,
                projectId: project.id
            }
        });
        res.status(201).json(project);
    }
    catch (error) {
        console.error('Create Project Error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});
// 2. Get All Projects for User (Admin or Member)
router.get('/', auth_middleware_1.authGuard, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const projects = await prisma_1.default.project.findMany({
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
    }
    catch (error) {
        console.error('Get Projects Error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
// 3. Get Project Details & Messages
router.get('/:id/messages', auth_middleware_1.authGuard, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (isNaN(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        // Check membership
        const isMember = await prisma_1.default.projectMember.findUnique({
            where: { userId_projectId: { userId, projectId } }
        });
        const isAdmin = await prisma_1.default.project.findFirst({
            where: { id: projectId, adminId: userId }
        });
        if (!isMember && !isAdmin) {
            return res
                .status(403)
                .json({ error: 'You are not a member of this project' });
        }
        const messages = await prisma_1.default.message.findMany({
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
    }
    catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// 4. Send Message (HTTP fallback for Socket.IO)
router.post('/:id/messages', auth_middleware_1.authGuard, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const { content } = req.body;
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (isNaN(projectId))
            return res.status(400).json({ error: 'Invalid project ID' });
        if (!content)
            return res
                .status(400)
                .json({ error: 'Message content is required' });
        // Check membership
        const isMember = await prisma_1.default.projectMember.findUnique({
            where: { userId_projectId: { userId, projectId } }
        });
        const isAdmin = await prisma_1.default.project.findFirst({
            where: { id: projectId, adminId: userId }
        });
        if (!isMember && !isAdmin) {
            return res
                .status(403)
                .json({ error: 'You are not a member of this project' });
        }
        const message = await prisma_1.default.message.create({
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
    }
    catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
exports.default = router;
