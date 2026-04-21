import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPostgresClient, isPostgresConfigured } from "../db/postgres.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, "../db/migrations/0001_initial.sql");

async function main() {
  if (!isPostgresConfigured()) {
    console.error("Postgres is not configured. Add POSTGRES_URL_NON_POOLING, POSTGRES_URL, or DATABASE_URL first.");
    process.exitCode = 1;
    return;
  }

  const sql = getPostgresClient();
  const migrationSql = await readFile(migrationPath, "utf8");

  await sql.unsafe(migrationSql);
  console.log("Applied db/migrations/0001_initial.sql");
  await sql.end({ timeout: 5 });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
