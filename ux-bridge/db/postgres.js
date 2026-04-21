import postgres from "postgres";
import { getPostgresConfig } from "./config.js";

let sqlClient = null;

export function isPostgresConfigured() {
  return getPostgresConfig().configured;
}

export function getPostgresClient() {
  const config = getPostgresConfig();

  if (!config.configured) {
    throw new Error("Postgres is not configured. Add POSTGRES_URL_NON_POOLING, POSTGRES_URL, or DATABASE_URL.");
  }

  if (!sqlClient) {
    sqlClient = postgres(config.url, {
      prepare: false,
      max: 1,
    });
  }

  return sqlClient;
}

export async function checkPostgresConnection() {
  if (!isPostgresConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "Postgres is not configured.",
    };
  }

  try {
    const sql = getPostgresClient();
    await sql`select 1 as ok`;
    return {
      configured: true,
      connected: true,
      error: "",
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Unable to connect to Postgres.",
    };
  }
}
