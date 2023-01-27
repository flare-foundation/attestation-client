import { logException } from "../../../src/utils/logger";
import { bootstrapAttestationWebServer } from "./attestation-client-test-utils";


process.env.NODE_ENV = "development"
process.env.TEST_CREDENTIALS = "1";
process.env.CONFIG_PATH = "../test/attestationClient/test-data/attester";

bootstrapAttestationWebServer()
.then(() => {})
.catch((error) => {
  logException(error, `runTestWebServer`);
  process.exit(1);
});
