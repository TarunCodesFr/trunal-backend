"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.validateUser = validateUser;
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
// To register the user in the database
async function createUser(email, username, password) {
    const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('User already exists');
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    return prisma_1.default.user.create({
        data: {
            email,
            username,
            passwordHash,
            role: 'USER'
        }
    });
}
// To login the user by validating credentials from the database
async function validateUser(email, password) {
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('User Does not exist');
    }
    const match = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!match) {
        throw new Error('Invalid credentials');
    }
    return user;
}
