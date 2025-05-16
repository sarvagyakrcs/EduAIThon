import { v4 as uuidv4 } from 'uuid';
import { PASSWORD_RESET_TOKEN_EXPIRE_TIME, VERIFICATION_TOKEN_EXPIRE_TIME } from '@/metadata';
import { getPasswordResetTokenByEmail, getVerificationTokenByEmail } from '@/actions/token';
import {prisma} from './db/prisma';
const db = prisma;

export const generateVerificationToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + VERIFICATION_TOKEN_EXPIRE_TIME * 1000);

    const existing_token = await getVerificationTokenByEmail(email);
    if (existing_token) {
        await db.verificationToken.delete({
            where: {
                id: existing_token.id
            }
        })
    }

    const verificationToken = await db.verificationToken.create({
        data: {
            email: email,
            token: token,
            expires: expires
        }
    })
    return verificationToken;
}

export const generatePasswordResetToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + PASSWORD_RESET_TOKEN_EXPIRE_TIME * 1000);

    const existing_token = await getPasswordResetTokenByEmail(email);
    if (existing_token) {
        await db.passwordResetToken.delete({
            where: {
                id: existing_token.id
            }
        })
    }

    const passwordREsetToken = await db.passwordResetToken.create({
        data: {
            email: email,
            token: token,
            expires: expires
        }
    })
    return passwordREsetToken;
}