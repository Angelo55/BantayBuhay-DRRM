import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  // Supabase's CA certificate (Database settings, SSL), so the database connection is verified.
  DATABASE_CA_FILE: z.string().optional(),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  // Only an explicit "false" turns this off, for local HTTP without TLS.
  COOKIE_SECURE: z.string().optional(),
  // The inference service's shared secret. Without it, the detection endpoints refuse everything.
  DETECTOR_TOKEN: z.string().min(32).optional(),
  // Snapshots go to Supabase Storage when these are set...
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SNAPSHOT_BUCKET: z.string().default("snapshots"),
  // ...or to a local folder. With neither, the API runs but refuses snapshot uploads.
  SNAPSHOT_DIR: z.string().optional(),
});

export type SnapshotStorage =
  | { kind: "supabase"; url: string; serviceRoleKey: string; bucket: string }
  | { kind: "folder"; dir: string }
  | { kind: "none" };

export interface Config {
  databaseUrl: string;
  databaseCaFile?: string;
  host: string;
  port: number;
  cookieSecure: boolean;
  detectorToken?: string;
  snapshots: SnapshotStorage;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Name the variables only, because their values may contain passwords.
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${names}`);
  }
  const data = result.data;
  if (Boolean(data.SUPABASE_URL) !== Boolean(data.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither");
  }
  const snapshots: SnapshotStorage =
    data.SUPABASE_URL && data.SUPABASE_SERVICE_ROLE_KEY
      ? {
          kind: "supabase",
          url: data.SUPABASE_URL.replace(/\/+$/, ""),
          serviceRoleKey: data.SUPABASE_SERVICE_ROLE_KEY,
          bucket: data.SNAPSHOT_BUCKET,
        }
      : data.SNAPSHOT_DIR
        ? { kind: "folder", dir: data.SNAPSHOT_DIR }
        : { kind: "none" };
  return {
    databaseUrl: data.DATABASE_URL,
    databaseCaFile: data.DATABASE_CA_FILE,
    host: data.HOST,
    port: data.PORT,
    cookieSecure: data.COOKIE_SECURE !== "false",
    detectorToken: data.DETECTOR_TOKEN,
    snapshots,
  };
}
