import fs from "fs";
import Web3 from "web3";
import { AttestationTypeScheme, ATT_BYTES, SOURCE_ID_BYTES, DataHashScheme, SupportedRequestType } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_RANDOM_UTILS_FILE,
  CODEGEN_TAB,
  DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  RANDOM_RESPONSE_HEADER,
} from "./cg-constants";
import { indentText, tab, trimStartNewline } from "./cg-utils";

export function randomHashItemValue(item: DataHashScheme, defaultReadObject = "{}") {
  let res = `${item.key}: randSol(${defaultReadObject}, "${item.key}", "${item.type}") as ${tsTypeForSolidityType(item.type)}`;
  return trimStartNewline(res);
}

export function randReqItemCode(type: SupportedRequestType, size: number) {
  let rand = Web3.utils.randomHex(size);
  switch (type) {
    case "AttestationType":
      throw new Error("This should not be used");
    case "NumberLike":
      return `toBN(Web3.utils.randomHex(${size}))`;
    case "SourceId":
      throw new Error("This should not be used");
    case "ByteSequenceLike":
      return `Web3.utils.randomHex(${size})`;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(type);
  }
}

// Todo utils knjižnica, ki ima za vsak tip random response
// Hexlify za vsak tip
// funkcija za enkodiranje vsakega od tipov

export function genRandomResponseCode(definition: AttestationTypeScheme, defaultReadObject = "{}") {
  let responseFields = definition.dataHashDefinition.map((item) => indentText(randomHashItemValue(item, defaultReadObject), CODEGEN_TAB)).join(",\n");
  let randomResponse = `
let response = {
${responseFields}      
} as ${DATA_HASH_TYPE_PREFIX}${definition.name};
`;
  return randomResponse;
}

export function genRandomResponseFunction(definition: AttestationTypeScheme) {
  return `
export function randomResponse${definition.name}() {
${indentText(genRandomResponseCode(definition), CODEGEN_TAB)}
   return response;
}
`;
}

function genRandomResponseCase(definition: AttestationTypeScheme) {
  let result = `
case AttestationType.${definition.name}:
   return randomResponse${definition.name}();
`;
  return trimStartNewline(result);
}

export function genRandomResponseForAttestationTypeFunction(definitions: AttestationTypeScheme[]) {
  let attestationTypeCases = definitions.map((definition) => indentText(genRandomResponseCase(definition), CODEGEN_TAB * 2)).join("\n");
  return `
export function getRandomResponseForType(attestationType: AttestationType) {
${tab()}switch(attestationType) {
${attestationTypeCases}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Wrong attestation type.")
  }   
}
`;
}

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

function genRandomAttestationCase(definition: AttestationTypeScheme) {
  let sourceIds = definition.supportedSources;
  return `
case AttestationType.${definition.name}:
${tab()}sourceIds = [${sourceIds}];
${tab()}sourceId = sourceIds[Math.floor(Math.random()*${sourceIds.length})];
${tab()}return {attestationType: randomAttestationType, sourceId } as ${ATTESTATION_TYPE_PREFIX}${definition.name};`;
}

export function randomRequest(definitions: AttestationTypeScheme[]) {
  let ids = definitions.map((definition) => definition.id).join(", ");
  let attestationTypeCases = definitions.map((definition) => genRandomAttestationCase(definition)).join("");
  return `
export function getRandomRequest() {  
${tab()}let ids = [${ids}];
${tab()}let randomAttestationType: AttestationType = ids[Math.floor(Math.random()*${definitions.length})];
${tab()}let sourceId: SourceId = -1;
${tab()}let sourceIds: SourceId[] = [];
${tab()}switch(randomAttestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Invalid attestation type");
${tab()}}
}
`;
}

function genRandomAttestationCaseForRandomRequest(definition: AttestationTypeScheme) {
  let randomValuesForRequestItems = definition.request
    .filter((item) => item.key != "attestationType" && item.key != "sourceId")
    .map((item) => `${item.key}: ${randReqItemCode(item.type, item.size)}`)
    .join(",\n");
  return `
case AttestationType.${definition.name}:
${tab()}return {
${tab()}${tab()}attestationType,
${tab()}${tab()}sourceId,
${indentText(randomValuesForRequestItems, CODEGEN_TAB * 2)}
${tab()}} as ${ATTESTATION_TYPE_PREFIX}${definition.name};`;
}

export function randomRequestForAttestationTypeAndSourceId(definitions: AttestationTypeScheme[]) {
  let ids = definitions.map((definition) => definition.id).join(", ");
  let attestationTypeCases = definitions.map((definition) => genRandomAttestationCaseForRandomRequest(definition)).join("");
  return `
export function getRandomRequestForAttestationTypeAndSourceId (
${tab()}attestationType: AttestationType,
${tab()}sourceId: SourceId
) {  
${tab()}switch(attestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Invalid attestation type");
${tab()}}
}
`;
}

export function createAttestationRandomUtils(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");
  let dhImports = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";
import { randSol } from "../attestation-types/attestation-types-helpers";
import { 
${indentText(arImports, CODEGEN_TAB)},
} from "./attestation-request-types";
import {
${indentText(dhImports, CODEGEN_TAB)},
} from "./attestation-hash-types";
import { AttestationType } from "./attestation-types-enum";
import { SourceId } from "../sources/sources";

const toBN = Web3.utils.toBN;
const web3 = new Web3();
`;

  definitions.forEach((definition) => {
    content += genRandomResponseFunction(definition);
  });

  content += RANDOM_RESPONSE_HEADER;

  content += genRandomResponseForAttestationTypeFunction(definitions);

  content += randomRequest(definitions);

  content += randomRequestForAttestationTypeAndSourceId(definitions);

  fs.writeFileSync(ATT_RANDOM_UTILS_FILE, content, "utf8");
}
