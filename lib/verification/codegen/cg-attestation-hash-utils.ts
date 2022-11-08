import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme, ATT_BYTES, SOURCE_ID_BYTES } from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_HASH_UTILS_FILE, DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  PRETTIER_SETTINGS,
  WEB3_HASH_FUNCTIONS_HEADER,
  WEB3_HASH_PREFIX_FUNCTION
} from "./cg-constants";

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

export function genWeb3HashFunction(definition: AttestationTypeScheme) {
  return `
export function ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request: ${ATTESTATION_TYPE_PREFIX}${definition.name}, response: ${DATA_HASH_TYPE_PREFIX}${
    definition.name
  }) {
${genHashCode(definition, "request", "response")}
	return web3.utils.soliditySha3(encoded)!;
}
`;
}

function genDatahashCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
	return ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request as ${ATTESTATION_TYPE_PREFIX}${definition.name}, response as ${DATA_HASH_TYPE_PREFIX}${
    definition.name
  });`;
}

export function genDataHashFunction(definitions: AttestationTypeScheme[]) {
  const datahashCases = definitions.map((definition) => genDatahashCase(definition)).join("");
  return `
export function dataHash(request: ${ATTESTATION_TYPE_PREFIX}Type, response: ${DATA_HASH_TYPE_PREFIX}Type) {  
	switch(request.attestationType) {
${datahashCases}
		default:
			throw new Error("Invalid attestation type");
	}
}
`;
}

export function createAttestationHashUtils(definitions: AttestationTypeScheme[]) {
  const arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");
  const dhImports = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import Web3 from "web3";
import { 
${arImports},
	${ATTESTATION_TYPE_PREFIX}Type 
} from "./attestation-request-types";
import {
${dhImports},
	${DATA_HASH_TYPE_PREFIX}Type 
} from "./attestation-hash-types";
import { AttestationType } from "./attestation-types-enum";

const web3 = new Web3();
`;

  content += WEB3_HASH_FUNCTIONS_HEADER;

  definitions.forEach((definition) => {
    content += genWeb3HashFunction(definition);
  });

  content += genDataHashFunction(definitions);

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_HASH_UTILS_FILE, prettyContent, "utf8");
}
