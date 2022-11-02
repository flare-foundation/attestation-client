import fs from "fs";
import prettier from 'prettier';
import Web3 from "web3";
import { AttestationTypeScheme, ATT_BYTES, DataHashScheme, SOURCE_ID_BYTES, SupportedRequestType } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_RANDOM_UTILS_FILE, DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  PRETTIER_SETTINGS,
  RANDOM_RESPONSE_HEADER
} from "./cg-constants";
import { trimStartNewline } from "./cg-utils";

export function randomHashItemValue(item: DataHashScheme, defaultReadObject = "{}") {
  const res = `${item.key}: randSol(${defaultReadObject}, "${item.key}", "${item.type}") as ${tsTypeForSolidityType(item.type)}`;
  return trimStartNewline(res);
}

export function randReqItemCode(type: SupportedRequestType, size: number) {
  const rand = Web3.utils.randomHex(size);
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
  const responseFields = definition.dataHashDefinition.map((item) => randomHashItemValue(item, defaultReadObject)).join(",\n");
  const randomResponse = `
let response = {
${responseFields}      
} as ${DATA_HASH_TYPE_PREFIX}${definition.name};
`;
  return randomResponse;
}

export function genRandomResponseFunction(definition: AttestationTypeScheme) {
  return `
export function randomResponse${definition.name}() {
${genRandomResponseCode(definition)}
   return response;
}
`;
}

function genRandomResponseCase(definition: AttestationTypeScheme) {
  const result = `
case AttestationType.${definition.name}:
   return randomResponse${definition.name}();
`;
  return trimStartNewline(result);
}

export function genRandomResponseForAttestationTypeFunction(definitions: AttestationTypeScheme[]) {
  const attestationTypeCases = definitions.map((definition) => genRandomResponseCase(definition)).join("\n");
  return `
export function getRandomResponseForType(attestationType: AttestationType) {
	switch(attestationType) {
${attestationTypeCases}
		default:
			throw new Error("Wrong attestation type.")
  }   
}
`;
}

export function genHashCode(definition: AttestationTypeScheme, defaultRequest = "response", defaultResponse = "response") {
  const types = definition.dataHashDefinition.map((item) => `"${item.type}",\t\t// ${item.key}`).join("\n");
  const values = definition.dataHashDefinition.map((item) => `${defaultResponse}.${item.key}`).join(",\n");
  return `
let encoded = web3.eth.abi.encodeParameters(
	[
		"uint${ATT_BYTES * 8}",\t\t// attestationType
		"uint${SOURCE_ID_BYTES * 8}",\t\t// sourceId
${types}
	],
	[
		${defaultRequest}.attestationType,
		${defaultRequest}.sourceId,
${values}
	]
);   
`;
}

function genRandomAttestationCase(definition: AttestationTypeScheme) {
  const sourceIds = definition.supportedSources;
  return `
case AttestationType.${definition.name}:
	sourceIds = [${sourceIds}];
	sourceId = sourceIds[Math.floor(Math.random()*${sourceIds.length})];
	return {attestationType: randomAttestationType, sourceId } as ${ATTESTATION_TYPE_PREFIX}${definition.name};`;
}

export function randomRequest(definitions: AttestationTypeScheme[]) {
  const ids = definitions.map((definition) => definition.id).join(", ");
  const attestationTypeCases = definitions.map((definition) => genRandomAttestationCase(definition)).join("");
  return `
export function getRandomRequest() {  
	let ids = [${ids}];
	let randomAttestationType: AttestationType = ids[Math.floor(Math.random()*${definitions.length})];
	let sourceId: SourceId = -1;
	let sourceIds: SourceId[] = [];
	switch(randomAttestationType) {
${attestationTypeCases}
		default:
			throw new Error("Invalid attestation type");
	}
}
`;
}

function genRandomAttestationCaseForRandomRequest(definition: AttestationTypeScheme) {
  const randomValuesForRequestItems = definition.request
    .filter((item) => item.key != "attestationType" && item.key != "sourceId")
    .map((item) => `${item.key}: ${randReqItemCode(item.type, item.size)}`)
    .join(",\n");
  return `
case AttestationType.${definition.name}:
	return {
		attestationType,
		sourceId,
${randomValuesForRequestItems}
	} as ${ATTESTATION_TYPE_PREFIX}${definition.name};`;
}

export function randomRequestForAttestationTypeAndSourceId(definitions: AttestationTypeScheme[]) {
  const ids = definitions.map((definition) => definition.id).join(", ");
  const attestationTypeCases = definitions.map((definition) => genRandomAttestationCaseForRandomRequest(definition)).join("");
  return `
export function getRandomRequestForAttestationTypeAndSourceId (
	attestationType: AttestationType,
	sourceId: SourceId
) {  
	switch(attestationType) {
${attestationTypeCases}
		default:
			throw new Error("Invalid attestation type");
	}
}
`;
}

export function createAttestationRandomUtils(definitions: AttestationTypeScheme[]) {
  const arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");
  const dhImports = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";
import { randSol } from "../attestation-types/attestation-types-helpers";
import { 
${arImports},
} from "./attestation-request-types";
import {
${dhImports},
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

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_RANDOM_UTILS_FILE, prettyContent, "utf8");
}
