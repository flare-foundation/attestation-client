import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQ_PARSER_TEST_FILE, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, GENERATED_TEST_ROOT, WEB3_HASH_PREFIX_FUNCTION } from "./cg-constants";
import { indentText, tab } from "./cg-utils";



function genItForAttestationParser(definition: AttestationTypeScheme) {
  let sourceIds = definition.supportedSources;
  return `
it("Should encode and decode for '${definition.name}'", async function () { 
${tab()}for(let sourceId of [${sourceIds}]) {
${tab()}${tab()}let randomRequest = getRandomRequestForAttestationTypeAndSourceId(${definition.id} as AttestationType, sourceId as SourceId) as ${ATTESTATION_TYPE_PREFIX}${definition.name};

${tab()}${tab()}let bytes = encodeRequest(randomRequest);
${tab()}${tab()}let parsedRequest = parseRequest(bytes);
${tab()}${tab()}assert(equalsRequest(randomRequest, parsedRequest));
${tab()}}
});`
}


export function createAttestationParserTest(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map(definition => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n")
  let dhImports = definitions.map(definition => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n")
  let hashFunctionsImports = definitions.map(definition => `${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`).join(",\n")

  let itsForDefinitions = definitions.map(definition => genItForAttestationParser(definition)).join("\n");
  let content = `${DEFAULT_GEN_FILE_HEADER}
import { 
${indentText(arImports, CODEGEN_TAB)} 
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { SourceId } from "../../lib/verification/sources/sources";
import { 
${tab()}getRandomRequestForAttestationTypeAndSourceId
} from "../../lib/verification/generated/attestation-random-utils";
import { encodeRequest } from "../../lib/verification/generated/attestation-request-encode";
import { parseRequest } from "../../lib/verification/generated/attestation-request-parse";
import { equalsRequest } from "../../lib/verification/generated/attestation-request-equals";

describe("Attestestation Request Parser", function () {

${indentText(itsForDefinitions, CODEGEN_TAB)}

});  
`;

  if (!fs.existsSync(GENERATED_TEST_ROOT)) {
    fs.mkdirSync(GENERATED_TEST_ROOT, { recursive: true });
  }
  fs.writeFileSync(`${GENERATED_TEST_ROOT}/${ATT_REQ_PARSER_TEST_FILE}`, content, "utf8");
}
