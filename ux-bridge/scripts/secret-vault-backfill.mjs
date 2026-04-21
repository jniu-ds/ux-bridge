import { backfillUserIntegrationSecretsToVault } from "../auth-store.js";

const result = await backfillUserIntegrationSecretsToVault();
console.log(JSON.stringify(result, null, 2));

if (!result.ok && !result.skipped) {
  process.exitCode = 1;
}
