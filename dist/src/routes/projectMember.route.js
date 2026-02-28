"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)({ mergeParams: true });
// Helper: check if requesting user is the project admin
async function isProjectAdmin(projectId, userId) {
    const project = await prisma_1.default.project.findUnique({
        where: { id: projectId }
    });
    return project?.adminId === userId;
}
// 1. Add a member to a project (admin-only)
router.post('/', auth_middleware_1.authGuard, async (req, res) => {
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
        const userExists = await prisma_1.default.user.findUnique({
            where: { user_id: targetUserId }
        });
        if (!userExists)
            return res.status(404).json({ error: 'User not found' });
        // Create membership (unique constraint will catch duplicates)
        const member = await prisma_1.default.projectMember.create({
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
    }
    catch (error) {
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
router.delete('/:userId', auth_middleware_1.authGuard, async (req, res) => {
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
        await prisma_1.default.projectMember.delete({
            where: {
                userId_projectId: {
                    userId: targetUserId,
                    projectId
                }
            }
        });
        res.json({ message: 'Member removed successfully' });
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res
                .status(404)
                .json({ error: 'Member not found in this project' });
        }
        console.error('Remove Member Error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});
// 3. List all members of a project
router.get('/', auth_middleware_1.authGuard, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        if (isNaN(projectId))
            return res.status(400).json({ error: 'Invalid project ID' });
        const members = await prisma_1.default.projectMember.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { user_id: true, username: true, email: true }
                }
            },
            orderBy: { joinedAt: 'asc' }
        });
        res.json(members);
    }
    catch (error) {
        console.error('List Members Error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});
exports.default = router;
