import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATTESTATION_TYPE_PREFIX, ATT_CLIENT_MOCK_TEST_FILE, ATT_REQ_PARSER_TEST_FILE, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, GENERATED_TEST_ROOT, SOLIDITY_VERIFICATION_FUNCTION_PREFIX, WEB3_HASH_PREFIX_FUNCTION } from "./cg-constants";
import { indentText, tab, trimStartNewline } from "./cg-utils";



function genItForAttestationParser(definition: AttestationTypeScheme) {
  let chainIds = definition.supportedSources;
  return `
it("Should encode and decode for '${definition.name}'", async function () { 
${tab()}for(let chainId of [${chainIds}]) {
${tab()}${tab()}let randomRequest = getRandomRequestForAttestationTypeAndChainId(${definition.id} as AttestationType, chainId as ChainType) as ${ATTESTATION_TYPE_PREFIX}${definition.name};
${tab()}${tab()}let scheme = definitions.find(item => item.id === ${definition.id});
${tab()}${tab()}let bytes = encodeRequestBytes(randomRequest, scheme);
${tab()}${tab()}let parsedRequest = parseRequestBytes(bytes, scheme);
${tab()}${tab()}for(let item of scheme.request) {
${tab()}${tab()}${tab()}assertEqualsByScheme(randomRequest[item.key], parsedRequest[item.key], item);
${tab()}${tab()}}
${tab()}}
});`
}


export function createAttestationParserTest(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map(definition => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n")
  let dhImports = definitions.map(definition => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n")
  let hashFunctionsImports = definitions.map(definition => `${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`).join(",\n")

  let itsForDefinitions = definitions.map(definition => genItForAttestationParser(definition)).join("\n");
  let content = `${DEFAULT_GEN_FILE_HEADER}
import { ChainType } from "flare-mcc";
import { AttestationTypeScheme } from "../../lib/verification/attestation-types/attestation-types";
import { assertEqualsByScheme, encodeRequestBytes, parseRequestBytes } from "../../lib/verification/attestation-types/attestation-types-helpers";
import { readAttestationTypeSchemes } from "../../lib/verification/codegen/cg-utils";
import { 
${indentText(arImports, CODEGEN_TAB)} 
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { 
${tab()}getRandomRequestForAttestationTypeAndChainId
} from "../../lib/verification/generated/attestation-utils";

describe("Attestestation Request Parser", function () {
${tab()}let definitions: AttestationTypeScheme[];

${tab()}before(async () => {
${tab()}${tab()}definitions = await readAttestationTypeSchemes();
${tab()}});

${indentText(itsForDefinitions, CODEGEN_TAB)}

});  
`;

  if (!fs.existsSync(GENERATED_TEST_ROOT)) {
    fs.mkdirSync(GENERATED_TEST_ROOT, { recursive: true });
  }
  fs.writeFileSync(`${GENERATED_TEST_ROOT}/${ATT_REQ_PARSER_TEST_FILE}`, content, "utf8");
}
