import { z } from "zod";

export const RegisterSchema = z.object({
    email: z.string().email().min(1, { message: "Email is required" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
})

export type RegisterSchemaType = z.infer<typeof RegisterSchema>