import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, DataHashScheme } from "../attestation-types/attestation-types";
import { randReqItemCode, tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
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
  let attestationTypeCases = definitions.map(definition => indentText(genRandomResponseCase(definition), CODEGEN_TAB * 2)).join("\n")
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

function genRandomAttestationCase(definition: AttestationTypeScheme) {
  let chainIds = definition.supportedSources;
  return `
case AttestationType.${definition.name}:
${tab()}chainIds = [${chainIds}];
${tab()}chainId = chainIds[Math.floor(Math.random()*${chainIds.length})];
${tab()}return {attestationType: randomAttestationType, chainId} as ${ATTESTATION_TYPE_PREFIX}${definition.name};`
}

export function randomRequest(definitions: AttestationTypeScheme[]) {
  let ids = definitions.map(definition => definition.id).join(", ");
  let attestationTypeCases = definitions.map(definition => genRandomAttestationCase(definition)).join("");
  return `
export function getRandomRequest() {  
${tab()}let ids = [${ids}];
${tab()}let randomAttestationType: AttestationType = ids[Math.floor(Math.random()*${definitions.length})];
${tab()}let chainId: ChainType = ChainType.invalid;
${tab()}let chainIds: ChainType[] = [];
${tab()}switch(randomAttestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Invalid attestation type");
${tab()}}
}
`
}

function genRandomAttestationCaseForRandomRequest(definition: AttestationTypeScheme) {
  let randomValuesForRequestItems = definition.request
    .filter(item => item.key != "attestationType" && item.key != "chainId")
    .map(item => `${item.key}: ${randReqItemCode(item.type, item.size)}`).join(",\n");
  return `
case AttestationType.${definition.name}:
${tab()}return {
${tab()}${tab()}attestationType,
${tab()}${tab()}chainId,
${indentText(randomValuesForRequestItems, CODEGEN_TAB * 2)}
${tab()}} as ${ATTESTATION_TYPE_PREFIX}${definition.name};`
}

export function randomRequestForAttestationTypeAndChainId(definitions: AttestationTypeScheme[]) {
  let ids = definitions.map(definition => definition.id).join(", ");
  let attestationTypeCases = definitions.map(definition => genRandomAttestationCaseForRandomRequest(definition)).join("");
  return `
export function getRandomRequestForAttestationTypeAndChainId (
${tab()}attestationType: AttestationType,
${tab()}chainId: ChainType
) {  
${tab()}switch(attestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Invalid attestation type");
${tab()}}
}
`
}

function genDatahashCase(definition: AttestationTypeScheme) {
  let chainIds = definition.supportedSources;
  return `
case AttestationType.${definition.name}:
${tab()}return ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request as ${ATTESTATION_TYPE_PREFIX}${definition.name}, response as ${DATA_HASH_TYPE_PREFIX}${definition.name});`
}

export function genDataHashFunction(definitions: AttestationTypeScheme[]) {
  let datahashCases = definitions.map(definition => genDatahashCase(definition)).join("");
  return `
export function dataHash(request: ${ATTESTATION_TYPE_PREFIX}Type, response: ${DATA_HASH_TYPE_PREFIX}Type) {  
${tab()}switch(request.attestationType) {
${indentText(datahashCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Invalid attestation type");
${tab()}}
}
`
}


export function createAttestationUtils(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map(definition => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n")
  let dhImports = definitions.map(definition => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n")

  let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";
import { ChainType, toBN } from "flare-mcc";
import { randSol } from "../attestation-types/attestation-types-helpers";
import { 
${indentText(arImports, CODEGEN_TAB)},
${tab()}${ATTESTATION_TYPE_PREFIX}Type 
} from "./attestation-request-types";
import {
${indentText(dhImports, CODEGEN_TAB)},
${tab()}${DATA_HASH_TYPE_PREFIX}Type 
} from "./attestation-hash-types";
import { AttestationType } from "./attestation-types-enum";
  
`;

  definitions.forEach(definition => {
    content += genRandomResponseFunction(definition);
  })

  content += RANDOM_RESPONSE_HEADER;

  content += genRandomResponseForAttestationTypeFunction(definitions);

  content += randomRequest(definitions);

  content += randomRequestForAttestationTypeAndChainId(definitions);

  content += WEB3_HASH_FUNCTIONS_HEADER;

  definitions.forEach(definition => {
    content += genWeb3HashFunction(definition);
  })

  content += genDataHashFunction(definitions);

  fs.writeFileSync(ATT_UTILS_FILE, content, "utf8");
}
