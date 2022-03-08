import { createSolidityAttestationClientMock } from "./cg-attestation-client-mock";
import { createAttestationHashTypesFile } from "./cg-attestation-data-hash-types";
import { createAttestationEnumFile } from "./cg-attestation-file-enum";
import { createAttestationRequestTypesFile } from "./cg-attestation-request-types";
import { createSolidityIAttestationClient } from "./cg-iattestation-client";
import { createHashTestSolidityFile } from "./cg-test-hash";
import { readAttestationTypeSchemes } from "./cg-utils";
import { createVerifiersAndRouter } from "./cg-verifiers-router";

async function generateCodeFiles() {
   let definitions = await readAttestationTypeSchemes();

   createAttestationEnumFile(definitions);
   createAttestationRequestTypesFile(definitions);
   createAttestationHashTypesFile(definitions);
   createHashTestSolidityFile(definitions);
   createVerifiersAndRouter(definitions);
   createSolidityIAttestationClient(definitions);
   createSolidityAttestationClientMock(definitions);
}

generateCodeFiles()
   .then(() => process.exit(0))
   .catch(error => {
      console.error(error);
      process.exit(1);
   });

