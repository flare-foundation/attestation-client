import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATTESTATION_TYPE_PREFIX, ATT_UTILS_FILE, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, RANDOM_RESPONSE_HEADER, WEB3_HASH_FUNCTIONS_HEADER, WEB3_HASH_PREFIX_FUNCTION } from "./cg-constants";
import { indentText, tab, trimStartNewline } from "./cg-utils";


export function randomHashItemValue(item: DataHashScheme, defaultReadObject = "{}") {
  let res = `${item.key}: randSol(${defaultReadObject}, "${item.key}", "${item.type}") as ${tsTypeForSolidityType(item.type)}`
  return trimStartNewline(res);
}

// Todo utils knjižnica, ki ima za vsak tip random response
// Hexlify za vsak tip
// funkcija za enkodiranje vsakega od tipov

export function genRandomResponseCode(definition: AttestationTypeScheme, defaultReadObject = "{}") {
  let responseFields = definition.dataHashDefinition.map(item => indentText(randomHashItemValue(item, defaultReadObject), CODEGEN_TAB)).join(",\n");
  let randomResponse =
    `
let response = {
${responseFields}      
} as ${DATA_HASH_TYPE_PREFIX}${definition.name};
`
  return randomResponse;
}

export function genRandomResponseFunction(definition: AttestationTypeScheme) {
  return `
export function randomResponse${definition.name}() {
${indentText(genRandomResponseCode(definition), CODEGEN_TAB)}
   return response;
}
`
}

function genRandomResponseCase(definition: AttestationTypeScheme) {
  let result = `
case AttestationType.${definition.name}:
   return randomResponse${definition.name}();
`;
  return trimStartNewline(result);
}


export function genRandomResponseForAttestationTypeFunction(definitions: AttestationTypeScheme[]) {
  let attestationTypeCases = definitions.map(definition => indentText(genRandomResponseCase(definition), CODEGEN_TAB*2)).join("\n")
  return `
export function getRandomResponseForType(attestationType: AttestationType) {
${tab()}switch(attestationType) {
${attestationTypeCases}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Wrong attestation type.")
  }   
}
`
}

export function genHashCode(definition: AttestationTypeScheme, defaultRequest = "response", defaultResponse = "response") {
  let types = definition.dataHashDefinition.map(item => `"${item.type}",\t\t// ${item.key}`).join("\n");
  let values = definition.dataHashDefinition.map(item => `${defaultResponse}.${item.key}`).join(",\n");
return `
let encoded = web3.eth.abi.encodeParameters(
${tab()}[
${tab()}${tab()}"uint${ATT_BYTES * 8}",\t\t// attestationType
${tab()}${tab()}"uint${CHAIN_ID_BYTES * 8}",\t\t// chainId
${indentText(types, CODEGEN_TAB * 2)}
${tab()}],
${tab()}[
${tab()}${tab()}${defaultRequest}.attestationType,
${tab()}${tab()}${defaultRequest}.chainId,
${indentText(values, CODEGEN_TAB * 2)}
${tab()}]
);   
`
}

export function genWeb3HashFunction(definition: AttestationTypeScheme) {
  return `
export function ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request: ${ATTESTATION_TYPE_PREFIX}${definition.name}, response: ${DATA_HASH_TYPE_PREFIX}${definition.name}) {
${indentText(genHashCode(definition, "request", "response"), CODEGEN_TAB)}
${tab()}return web3.utils.soliditySha3(encoded)!;
}
`
}

export function createAttestationUtils(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map(definition => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(", ")
  let dhImports = definitions.map(definition => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(", ")

  let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import { randSol } from "../attestation-types/attestation-types-helpers";
import { ${arImports} } from "./attestation-request-types";
import { ${dhImports} } from "./attestation-hash-types";

import { AttestationType } from "./attestation-types-enum";
  
`;

  definitions.forEach(definition => {
    content += genRandomResponseFunction(definition);
  })

  content += RANDOM_RESPONSE_HEADER;
  
  content += genRandomResponseForAttestationTypeFunction(definitions);

  content += WEB3_HASH_FUNCTIONS_HEADER;

  definitions.forEach(definition => {
    content += genWeb3HashFunction(definition);
  })

  fs.writeFileSync(ATT_UTILS_FILE, content, "utf8");
}
