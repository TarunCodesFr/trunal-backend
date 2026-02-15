"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        // 1. Find or Create a Test User
        let user = await prisma_1.default.user.findUnique({
            where: { email: 'test@admin.com' }
        });
        if (!user) {
            const passwordHash = await bcrypt_1.default.hash('password123', 10);
            user = await prisma_1.default.user.create({
                data: {
                    email: 'test@admin.com',
                    username: 'TestAdmin',
                    passwordHash,
                    role: 'ADMIN'
                }
            });
            console.log('Created test user:', user.email);
        }
        // 2. Create a Test Project for this user
        const project = await prisma_1.default.project.create({
            data: {
                name: `Test Project ${new Date().getTime()}`, // Unique name
                adminId: user.user_id
            }
        });
        // 3. Create a welcome message
        await prisma_1.default.message.create({
            data: {
                content: 'Welcome to the test project! Start chatting.',
                senderId: user.user_id,
                projectId: project.id
            }
        });
        res.json({
            message: 'Database seeded successfully!',
            user: {
                email: user.email,
                password: 'password123'
            },
            project: {
                id: project.id,
                name: project.name
            },
            nextStep: `Login with the user above, then go to http://localhost:3000/portal/project/${project.id}`
        });
    }
    catch (error) {
        console.error('Seed Error:', error);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});
exports.default = router;
