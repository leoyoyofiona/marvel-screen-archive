import "server-only";
import { schema } from "./community-schema.mjs";
type Store = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
  exec?: (text: string) => Promise<unknown>;
};
// Share one connection across route bundles and dev hot reload. Production workers
// still own separate bounded pools; no existing website/database is reused.
const runtimeStore = globalThis as typeof globalThis & { marvelDatabaseReady?: Promise<Store> };
export function databaseMode() {
  return process.env.DATABASE_URL
    ? "postgres"
    : process.env.NODE_ENV !== "production" &&
        process.env.MARVEL_LOCAL_DB === "true"
      ? "local-development"
      : "unavailable";
}
export function database(): Promise<Store> {
  if (runtimeStore.marvelDatabaseReady) return runtimeStore.marvelDatabaseReady;
  runtimeStore.marvelDatabaseReady = (async () => {
    const mode = databaseMode();
    if (mode === "unavailable") throw new Error("DATABASE_UNAVAILABLE");
    let db: Store;
    if (mode === "local-development") {
      const { PGlite } = await import("@electric-sql/pglite");
      const { mkdir } = await import("node:fs/promises");
      await mkdir(".local", { recursive: true });
      db = new PGlite(".local/community") as unknown as Store;
      await db.exec?.(schema);
    } else {
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 4,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 8000,
      });
      db = pool as unknown as Store;
      await db.query(schema);
    }
    return db;
  })().catch((error) => {
    runtimeStore.marvelDatabaseReady = undefined;
    throw error;
  });
  return runtimeStore.marvelDatabaseReady;
}
