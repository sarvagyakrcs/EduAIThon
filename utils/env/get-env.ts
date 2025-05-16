export const getEnv = (name: string) => {
    const env = process.env[name];
    if (!env) {
        throw new Error(`Environment variable ${name} is not defined`);
    }
    return env;
}