// Applies the migrations in drizzle/ to DATABASE_URL. Idempotent; runs before every build and by hand via `npm run db:migrate`.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) { console.warn("migrate: DATABASE_URL is not set, skipping"); process.exit(0); }
await migrate(drizzle({ client: neon(url) }), { migrationsFolder: "drizzle" });
console.log("migrate: database is up to date");
