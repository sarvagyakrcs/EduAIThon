"use server";
import {prisma} from "@/lib/db/prisma";

/**
 * Retrieves a user by their email from the database, based on the current session.
 * 
 * @async
 * @function GetUserByEmail
 * @returns {Promise<object>} - Returns the user data if authenticated and found, or an error response if not authenticated or not found.
 */
export const GetUserByEmail = async (email: string | undefined) => {
    if(!email) {
        return null;
    }
    try {
        const user = await prisma.user.findFirst({
            where: {
                email
            }
        });
        
        if (!user) {
            return null;
        }
        
        return user;
        
    } catch (error) {
        console.error({ error });
        return null;
    }
};

/**
 * Retrieves a user by their userid(primary key) from the database, based on the current session.
 * 
 * @async
 * @function GetUserByEmail
 * @returns {Promise<object>} - Returns the user data if authenticated and found, or an error response if not authenticated or not found.
 */
export const GetUserById = async (id: string | undefined) => {
    if(!id){
        return null;
    }
    try {
        const user = await prisma.user.findUnique({
            where: {
                id
            }
        });
        
        if (!user) {
            return null;
        }
        
        return user;
        
    } catch (error) {
        console.error({ error });
        return null;
    }
};
