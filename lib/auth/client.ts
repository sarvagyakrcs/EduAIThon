import { getEnv } from "@/utils/env/get-env"
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
    /** the base url of the server (optional if you're using the same domain) */
    baseURL: getEnv("BETTER_AUTH_URL"),
})

export const { signIn, signUp, useSession } = createAuthClient()
