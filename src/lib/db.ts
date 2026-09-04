import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";

/**
 * The one database handle: Drizzle over Neon's HTTP driver in production (DATABASE_URL comes from the Vercel
 * Marketplace integration), or whatever tests inject through setDb() (an in-process Postgres). Schema lives in
 * src/db/schema.ts; migrations in drizzle/ are applied by scripts/migrate.ts.
 */
export type Db = NeonHttpDatabase<typeof schema> | PgliteDatabase<typeof schema>;
export { schema };

let injected: Db | null = null;
let live: Db | null = null;

export function dbConfigured(): boolean { return Boolean(injected || process.env.DATABASE_URL); }

export function getDb(): Db {
  if (injected) return injected;
  if (!live) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    live = drizzleNeon({ client: neon(url), schema, casing: "snake_case" });
  }
  return live;
}

/** Tests and scripts point the site at another Postgres. */
export function setDb(db: Db | null) { injected = db; }

/**
 * Run several writes as one unit. Neon over HTTP has no session, so it offers `batch` (one round trip, one transaction);
 * the in-process driver has real transactions instead. Queries are built against `db` up front and passed in lazily.
 */
export async function atomic(db: Db, queries: { execute(): Promise<unknown> }[]): Promise<void> {
  if (queries.length === 0) return;
  if ("batch" in db && typeof db.batch === "function") {
    await (db as NeonHttpDatabase<typeof schema>).batch(queries as unknown as Parameters<NeonHttpDatabase<typeof schema>["batch"]>[0]);
    return;
  }
  await db.execute(sql`begin`);
  try { for (const q of queries) await q.execute(); await db.execute(sql`commit`); }
  catch (e) { await db.execute(sql`rollback`); throw e; }
}
