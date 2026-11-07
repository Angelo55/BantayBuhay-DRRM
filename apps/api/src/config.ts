import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  // Only an explicit "false" turns this off, for local HTTP without TLS.
  COOKIE_SECURE: z.string().optional(),
  // The inference service's shared secret. Without it, the detection endpoints refuse everything.
  DETECTOR_TOKEN: z.string().min(32).optional(),
  SNAPSHOT_DIR: z.string().default("/data/snapshots"),
});

export interface Config {
  databaseUrl: string;
  redisUrl: string;
  host: string;
  port: number;
  cookieSecure: boolean;
  detectorToken?: string;
  snapshotDir: string;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Name the variables only, because their values may contain passwords.
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${names}`);
  }
  const { DATABASE_URL, REDIS_URL, HOST, PORT, COOKIE_SECURE, DETECTOR_TOKEN, SNAPSHOT_DIR } =
    result.data;
  return {
    databaseUrl: DATABASE_URL,
    redisUrl: REDIS_URL,
    host: HOST,
    port: PORT,
    cookieSecure: COOKIE_SECURE !== "false",
    detectorToken: DETECTOR_TOKEN,
    snapshotDir: SNAPSHOT_DIR,
  };
}
