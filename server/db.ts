import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

// Auto-load .env file if process.env.DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  const envPaths = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", "truckgear-os", ".env"),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const lines = fs.readFileSync(envPath, "utf-8").split("\n");
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = match[2] || "";
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (!process.env[key]) process.env[key] = value;
          }
        }
      } catch (_) {}
    }
  }
}

// Default fallback connection string for local Beelink Postgres
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:Bc061192!@127.0.0.1:5433/truckgear_data";
}

const { Pool } = pg;
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
});
export const db = drizzle(pool, { schema });
