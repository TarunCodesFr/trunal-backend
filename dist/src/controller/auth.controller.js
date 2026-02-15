"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_services_1 = require("../services/auth.services");
const auth_validator_1 = require("../validators/auth.validator");
async function register(req, res) {
    try {
        const parsed = auth_validator_1.registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.issues.map((e) => e.message)
            });
        }
        const { email, username, password } = parsed.data;
        const user = await (0, auth_services_1.createUser)(email, username, password);
        res.json({
            message: 'User registered successfully',
            user: {
                id: user.user_id,
                email: user.email,
                username: user.username
            }
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}
async function login(req, res) {
    try {
        const parsed = auth_validator_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.issues.map((e) => e.message)
            });
        }
        const { email, password } = parsed.data;
        const user = await (0, auth_services_1.validateUser)(email, password);
        const token = jsonwebtoken_1.default.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'Login successful',
            token
        });
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
}
