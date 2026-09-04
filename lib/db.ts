import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../db/schema";

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return drizzle(neon(url), { schema });
}

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!db) db = createDb();
  return db;
}
