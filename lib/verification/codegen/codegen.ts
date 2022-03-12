import { createSolidityAttestationClientBase } from "./cg-attestation-client-base";
import { createAttestationClientMockTest } from "./cg-attestation-client-mock-test";
import { createAttestationHashTypesFile } from "./cg-attestation-data-hash-types";
import { createAttestationEnumFile } from "./cg-attestation-file-enum";
import { createAttestationRequestTypesFile } from "./cg-attestation-request-types";
import { createAttestationUtils } from "./cg-attestation-utils";
import { createSolidityIAttestationClient } from "./cg-iattestation-client";
import { readAttestationTypeSchemes } from "./cg-utils";
import { createVerifiersImportFiles } from "./cg-verifier-imports";
import { createVerifiersAndRouter } from "./cg-verifiers-router";

async function generateCodeFiles() {
   let definitions = await readAttestationTypeSchemes();

   createAttestationEnumFile(definitions);
   createAttestationRequestTypesFile(definitions);
   createAttestationHashTypesFile(definitions);
   createAttestationUtils(definitions);
   // createHashTestSolidityFile(definitions);
   createVerifiersAndRouter(definitions);
   createSolidityIAttestationClient(definitions);
   createSolidityAttestationClientBase(definitions);
   createVerifiersImportFiles(definitions);   
   createAttestationClientMockTest(definitions);
}

generateCodeFiles()
   .then(() => process.exit(0))
   .catch(error => {
      console.error(error);
      process.exit(1);
   });

