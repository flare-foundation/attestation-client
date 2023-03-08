import { logException } from "../../../src/utils/logging/logger";
import { bootstrapAttestationWebServer } from "./attestation-client-test-utils";


process.env.NODE_ENV = "development"
// Should be set from outside:
// process.env.TEST_CREDENTIALS = "1";
// the correct:
// process.env.CONFIG_PATH

bootstrapAttestationWebServer()
.then(() => {})
.catch((error) => {
  logException(error, `runTestWebServer`);
  process.exit(1);
});
