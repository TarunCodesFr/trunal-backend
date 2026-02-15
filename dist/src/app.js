"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// libs
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'http://192.168.1.1:3000',
        process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    credentials: true
}));
app.use(express_1.default.json());
// routes AFTER middleware
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const project_route_1 = __importDefault(require("./routes/project.route"));
const seed_route_1 = __importDefault(require("./routes/seed.route"));
app.use('/api/auth', auth_route_1.default);
app.use('/api/projects', project_route_1.default);
app.use('/api/seed', seed_route_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});
app.get('/test-db', async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: {
                user_id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        res.json(users);
    }
    catch (error) {
        console.error('DB Test Error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});
exports.default = app;
