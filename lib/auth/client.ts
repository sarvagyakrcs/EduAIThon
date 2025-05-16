import { getEnv } from "@/utils/env/get-env"
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
    baseURL: getEnv("BETTER_AUTH_URL"),
})

export const { signIn, signUp, useSession } = createAuthClient()
