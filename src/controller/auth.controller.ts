import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, validateUser } from '../services/auth.services';
import { registerSchema, loginSchema } from '../validators/auth.validator';

export async function register(req: Request, res: Response) {
    try {
        const parsed = registerSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.issues.map((e) => e.message)
            });
        }

        const { email, username, password } = parsed.data;

        const user = await createUser(email, username, password);

        res.json({
            message: 'User registered successfully',
            user: {
                id: user.user_id,
                email: user.email,
                username: user.username
            }
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const parsed = loginSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.issues.map((e) => e.message)
            });
        }

        const { email, password } = parsed.data;

        const user = await validateUser(email, password);

        const token = jwt.sign(
            { userId: user.user_id, role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token
        });
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
}
