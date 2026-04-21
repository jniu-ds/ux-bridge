import { getStorageHealthSnapshot } from "../db/config.js";
import { checkPostgresConnection } from "../db/postgres.js";

async function main() {
  const snapshot = getStorageHealthSnapshot();
  const postgres = await checkPostgresConnection();

  console.log(
    JSON.stringify(
      {
        ...snapshot,
        postgres: {
          ...snapshot.postgres,
          connected: postgres.connected,
          error: postgres.error,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
