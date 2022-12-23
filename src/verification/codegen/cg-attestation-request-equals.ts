import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_REQUEST_EQUALS_FILE, DEFAULT_GEN_FILE_HEADER,
  PRETTIER_SETTINGS,
  REQUEST_ENCODE_FUNCTIONS_HEADER,
  REQUEST_EQUALS_PREFIX_FUNCTION
} from "./cg-constants";

function genEqualsException() {
  return `
export class AttestationRequestEqualsError extends Error {
	constructor(message: any) {
		super(message);
		this.name = 'AttestationRequestEqualsError';
	}
}
`;
}

export function genRequestEqualsFunctionForDefinition(definition: AttestationTypeScheme) {
  const checkList = [];

  for (const item of definition.request) {
    const check = `if(!assertEqualsByScheme(request1.${item.key}, request2.${item.key}, "${item.type}")) {
	return false;
}`;
    checkList.push(check);
  }
  const checks = checkList.join("\n");

  return `
export function ${REQUEST_EQUALS_PREFIX_FUNCTION}${definition.name}(request1: ${ATTESTATION_TYPE_PREFIX}${
    definition.name
  }, request2: ${ATTESTATION_TYPE_PREFIX}${definition.name}) {
${checks}
	return true;
}
`;
}

function genEqualsAttestationTypeCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
	return ${REQUEST_EQUALS_PREFIX_FUNCTION}${definition.name}(request1 as ${ATTESTATION_TYPE_PREFIX}${
    definition.name
  }, request2 as ${ATTESTATION_TYPE_PREFIX}${definition.name});`;
}

export function genRequestEqualsFunction(definitions: AttestationTypeScheme[]) {
  const attestationTypeCases = definitions.map((definition) => genEqualsAttestationTypeCase(definition)).join("");
  return `
export function ${REQUEST_EQUALS_PREFIX_FUNCTION}Request(request1: ${ATTESTATION_TYPE_PREFIX}Type, request2: ${ATTESTATION_TYPE_PREFIX}Type): boolean  {  
	if(request1.attestationType != request2.attestationType) {
		return false;
	}
	switch(request1.attestationType) {
${attestationTypeCases}
		default:
			throw new AttestationRequestEqualsError("Invalid attestation type");
	}
}
`;
}

function assertEqualsBySchemeFunction() {
  return `
export function assertEqualsByScheme(a: any, b: any, type: string) {
	switch (type) {
		case "AttestationType":
			return a === b;
		case "NumberLike":
			return toBN(a).eq(toBN(b));
		case "SourceId":
			return a === b;
		case "ByteSequenceLike":
			return a === b;
		default:
			throw new AttestationRequestEqualsError("Wrong type")      
	}
}
`;
}

export function createAttestationRequestEquals(definitions: AttestationTypeScheme[]) {
  const arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import Web3 from "web3";  
import { 
${arImports},
	${ATTESTATION_TYPE_PREFIX}Type 
} from "./attestation-request-types";
import { AttestationType } from "./attestation-types-enum";

const toBN = Web3.utils.toBN;
`;

  content += REQUEST_ENCODE_FUNCTIONS_HEADER;

  content += genEqualsException();

  content += assertEqualsBySchemeFunction();

  definitions.forEach((definition) => {
    content += genRequestEqualsFunctionForDefinition(definition);
  });

  content += genRequestEqualsFunction(definitions);

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_REQUEST_EQUALS_FILE, prettyContent, "utf8");
}
