import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export const forceInMemoryStorage =
  process.env.USE_IN_MEMORY_STORAGE?.toLowerCase() === "true" || !process.env.DATABASE_URL;
export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL) && !forceInMemoryStorage;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required. Please ensure the database is provisioned.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client:', err.message);
});

export const db = drizzle(pool, { schema });
