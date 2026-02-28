"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controller/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
router.post('/register', auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.get('/me', auth_middleware_1.authGuard, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
// Get all users (admin-only) — for member assignment in admin portal
router.get('/users', auth_middleware_1.authGuard, async (req, res) => {
    try {
        const requestingUser = req.user;
        if (requestingUser.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const users = await prisma_1.default.user.findMany({
            select: {
                user_id: true,
                email: true,
                username: true,
                role: true
            },
            orderBy: { username: 'asc' }
        });
        res.json(users);
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
exports.default = router;
