import NextAuth from "next-auth"
import {prisma} from "@/lib/db/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import authConfig from "@/auth.config";
import { GetUserById } from "./actions/user";
const db = prisma;

export const { auth, handlers, signIn, signOut } = NextAuth({
	pages: {
		signIn: '/login',
		error: '/error'
	},
	adapter: PrismaAdapter(db),
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async signIn({ user, account }){
			const existingUser = await GetUserById(user.id);
			if(account?.provider !== "credentials"){
				//allow OAuth users to login without email verification
				return true;
			}
			if(!existingUser || !existingUser?.emailVerified){
				//dont allow non verified users to login
				return false;
			}
			// TODO : Add 2FA check
			return true;
		},
		async jwt({token}){
			if(!token.sub) return token; //User Logged Out
			const existingUser = await GetUserById(token.sub);
			if(!existingUser) return token;
			token.role = existingUser.role;
			token.name = existingUser.name;
			token.email = existingUser.email;
			token.name = existingUser.firstName + " " + existingUser.lastName;
			
			return token;
		},
		async session({session, token}){
			if(token.sub && session.user){
				session.user.id = token.sub;
			}
			if(token.role && session.user){
				session.user.role = token.role;
			}
			if(session.user && token.email){
				session.user.name = token.name;
				session.user.email = token.email;
			}
			return session;
		}
	},
	...authConfig
})