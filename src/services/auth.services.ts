import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';

// To register the user in the database
export async function createUser(
    email: string,
    username: string,
    password: string
) {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.user.create({
        data: {
            email,
            username,
            passwordHash,
            role: 'USER'
        }
    });
}

// To login the user by validating credentials from the database
export async function validateUser(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new Error('User Does not exist');
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
        throw new Error('Invalid credentials');
    }

    return user;
}
