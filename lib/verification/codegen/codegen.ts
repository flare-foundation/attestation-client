import { readAttestationTypeSchemes } from "../attestation-types/attestation-types-helpers";
import { createSolidityAttestationClientBase } from "./cg-attestation-client-base";
import { createAttestationClientMockTest } from "./cg-attestation-client-mock-test";
import { createAttestationHashTypesFile } from "./cg-attestation-data-hash-types";
import { createAttestationEnumFile } from "./cg-attestation-file-enum";
import { createAttestationHashUtils } from "./cg-attestation-hash-utils";
import { createAttestationParserTest } from "./cg-attestation-parser-test";
import { createAttestationRandomUtils } from "./cg-attestation-random-utils";
import { createAttestationRequestEncode } from "./cg-attestation-request-encode";
import { createAttestationRequestEquals } from "./cg-attestation-request-equals";
import { createAttestationRequestParse } from "./cg-attestation-request-parse";
import { createAttestationRequestTypesFile } from "./cg-attestation-request-types";
import { createSolidityIAttestationClient } from "./cg-iattestation-client";
import { createVerifiersImportFiles } from "./cg-verifier-imports";
import { createVerifiersAndRouter } from "./cg-verifiers-router";

/**
 * Generates all auto generated files
 */
async function generateCodeFiles() {
  const definitions = await readAttestationTypeSchemes();

  createAttestationEnumFile(definitions);
  createAttestationRequestTypesFile(definitions);
  createAttestationHashTypesFile(definitions);
  createAttestationRandomUtils(definitions);
  createAttestationHashUtils(definitions);
  createAttestationRequestParse(definitions);
  createAttestationRequestEncode(definitions);
  createAttestationRequestEquals(definitions);
  createVerifiersAndRouter(definitions);
  createSolidityIAttestationClient(definitions);
  createSolidityAttestationClientBase(definitions);
  createVerifiersImportFiles(definitions);
  createAttestationClientMockTest(definitions);
  createAttestationParserTest(definitions);
}

generateCodeFiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
