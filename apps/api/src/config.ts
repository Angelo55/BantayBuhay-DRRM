import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
});

export interface Config {
  databaseUrl: string;
  redisUrl: string;
  host: string;
  port: number;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Name the variables only, because their values may contain passwords.
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${names}`);
  }
  const { DATABASE_URL, REDIS_URL, HOST, PORT } = result.data;
  return { databaseUrl: DATABASE_URL, redisUrl: REDIS_URL, host: HOST, port: PORT };
}
