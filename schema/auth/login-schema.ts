import { z } from "zod";

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Please Enter a Password.")
})

export type LoginSchemaType = z.infer<typeof LoginSchema>