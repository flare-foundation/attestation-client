import { AttestationClientConfig } from "../../../src/attester/AttestationClientConfig";
import { AttesterClient } from "../../../src/attester/AttesterClient";
import { readSecureConfig } from "../../../src/utils/configSecure";
import { logException, setLoggerName } from "../../../src/utils/logger";

const yargs = require("yargs");

const args = yargs
  .option("n", { alias: "n", type: "number", description: "Instance label", demand: true })
  .option("configPath", { alias: "c", type: "string", description: "Config path", demand: false, default: undefined })
  .option("testDBPath", { alias: "d", type: "string", description: "Path to better-sqlite3 DB", demand: false, default: undefined })
  .argv;

export async function bootstrapAttestationClient(n: number, configPath?: string, testDBPath?: string) {
  process.env.NODE_ENV = "development"
  process.env.TEST_IN_MEMORY_DB = "1";
  process.env.TEST_CREDENTIALS = "1";
  if(configPath) {
    process.env.CONFIG_PATH = configPath;
  }
  if(testDBPath) {
    process.env.TEST_DB_PATH = testDBPath;
  }
  
  // Reading configuration
  const config = await readSecureConfig(new AttestationClientConfig(), `attester_${n}`);

  // Create and start Attester Client
  let client = new AttesterClient(config);
  await client.runAttesterClient();
}

setLoggerName(`test-attester-${args["n"]}`);

bootstrapAttestationClient(args["n"], args["configPath"], args["testDBPath"])
.then(() => {})
.catch((error) => {
  logException(error, `runIndexer`);
  process.exit(1);
});
