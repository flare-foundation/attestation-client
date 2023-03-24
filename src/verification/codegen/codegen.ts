import { readAttestationTypeSchemes } from "../attestation-types/attestation-types-helpers";
import { VerifierTypeConfigGenerationChecker } from "../attestation-types/verifier-configs";
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
import { VERIFIER_DTO_HASH_TYPE_FILE, VERIFIER_DTO_REQUEST_TYPE_FILE, WEB_SERVER_DTO_HASH_TYPE_FILE, WEB_SERVER_DTO_REQUEST_TYPE_FILE } from "./cg-constants";
import { createSolidityIAttestationClient } from "./cg-iattestation-client";
import { createVerifiersImportFiles } from "./cg-verifier-imports";
import { createVerifiersAndRouter } from "./cg-verifiers-router";

/**
 * Generates all auto generated files
 */
async function generateCodeFiles() {
  const definitions = await readAttestationTypeSchemes();
  const verifierGenChecker = new VerifierTypeConfigGenerationChecker();

  createAttestationEnumFile(definitions);
  createAttestationRequestTypesFile(definitions, {});
  createAttestationRequestTypesFile(definitions, { dto: true, filePath: VERIFIER_DTO_REQUEST_TYPE_FILE, verifierGenChecker, verifierValidation: true });
  createAttestationRequestTypesFile(definitions, { dto: true, filePath: WEB_SERVER_DTO_REQUEST_TYPE_FILE });

  createAttestationHashTypesFile(definitions, {});
  createAttestationHashTypesFile(definitions, { dto: true, filePath: VERIFIER_DTO_HASH_TYPE_FILE, verifierGenChecker });
  createAttestationHashTypesFile(definitions, { dto: true, filePath: WEB_SERVER_DTO_HASH_TYPE_FILE });

  createAttestationRandomUtils(definitions);
  createAttestationHashUtils(definitions);
  createAttestationRequestParse(definitions);
  createAttestationRequestEncode(definitions);
  createAttestationRequestEquals(definitions);
  createVerifiersAndRouter(definitions, verifierGenChecker);
  createSolidityIAttestationClient(definitions);
  createSolidityAttestationClientBase(definitions);
  createVerifiersImportFiles(definitions, verifierGenChecker);
  createAttestationClientMockTest(definitions);
  createAttestationParserTest(definitions);
}

generateCodeFiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
