import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, SOURCE_ID_BYTES } from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_HASH_UTILS_FILE,
  CODEGEN_TAB,
  DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  WEB3_HASH_FUNCTIONS_HEADER,
  WEB3_HASH_PREFIX_FUNCTION,
} from "./cg-constants";
import { indentText, tab } from "./cg-utils";

export function genHashCode(definition: AttestationTypeScheme, defaultRequest = "response", defaultResponse = "response") {
  let types = definition.dataHashDefinition.map((item) => `"${item.type}",\t\t// ${item.key}`).join("\n");
  let values = definition.dataHashDefinition.map((item) => `${defaultResponse}.${item.key}`).join(",\n");
  return `
let encoded = web3.eth.abi.encodeParameters(
${tab()}[
${tab()}${tab()}"uint${ATT_BYTES * 8}",\t\t// attestationType
${tab()}${tab()}"uint${SOURCE_ID_BYTES * 8}",\t\t// sourceId
${indentText(types, CODEGEN_TAB * 2)}
${tab()}],
${tab()}[
${tab()}${tab()}${defaultRequest}.attestationType,
${tab()}${tab()}${defaultRequest}.sourceId,
${indentText(values, CODEGEN_TAB * 2)}
${tab()}]
);   
`;
}

export function genWeb3HashFunction(definition: AttestationTypeScheme) {
  return `
export function ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request: ${ATTESTATION_TYPE_PREFIX}${definition.name}, response: ${DATA_HASH_TYPE_PREFIX}${
    definition.name
  }) {
${indentText(genHashCode(definition, "request", "response"), CODEGEN_TAB)}
${tab()}return web3.utils.soliditySha3(encoded)!;
}
`;
}

function genDatahashCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
${tab()}return ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request as ${ATTESTATION_TYPE_PREFIX}${definition.name}, response as ${DATA_HASH_TYPE_PREFIX}${
    definition.name
  });`;
}

export function genDataHashFunction(definitions: AttestationTypeScheme[]) {
  let datahashCases = definitions.map((definition) => genDatahashCase(definition)).join("");
  return `
export function dataHash(request: ${ATTESTATION_TYPE_PREFIX}Type, response: ${DATA_HASH_TYPE_PREFIX}Type) {  
${tab()}switch(request.attestationType) {
${indentText(datahashCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Invalid attestation type");
${tab()}}
}
`;
}

export function createAttestationHashUtils(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");
  let dhImports = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import Web3 from "web3";
import { 
${indentText(arImports, CODEGEN_TAB)},
${tab()}${ATTESTATION_TYPE_PREFIX}Type 
} from "./attestation-request-types";
import {
${indentText(dhImports, CODEGEN_TAB)},
${tab()}${DATA_HASH_TYPE_PREFIX}Type 
} from "./attestation-hash-types";
import { AttestationType } from "./attestation-types-enum";

const web3 = new Web3();
`;

  content += WEB3_HASH_FUNCTIONS_HEADER;

  definitions.forEach((definition) => {
    content += genWeb3HashFunction(definition);
  });

  content += genDataHashFunction(definitions);

  fs.writeFileSync(ATT_HASH_UTILS_FILE, content, "utf8");
}
