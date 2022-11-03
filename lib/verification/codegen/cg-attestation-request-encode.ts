import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_REQUEST_ENCODE_FILE, DEFAULT_GEN_FILE_HEADER,
  PRETTIER_SETTINGS,
  REQUEST_ENCODE_FUNCTIONS_HEADER,
  REQUEST_ENCODE_PREFIX_FUNCTION
} from "./cg-constants";

function genEncodeException() {
  return `
export class AttestationRequestEncodeError extends Error {
	constructor(message: any) {
		super(message);
		this.name = 'AttestationRequestEncodeError';
	}
}
`;
}

export function genRequestEncodeFunctionForDefinition(definition: AttestationTypeScheme) {
  const checkList = [];
  const bytesList = [];

  for (const item of definition.request) {
    const check = `if(request.${item.key} == null) {
	throw new AttestationRequestEncodeError("Missing '${item.key}'")
}`;
    checkList.push(check);
    const bytesPiece = `bytes += toUnprefixedBytes(request.${item.key}, "${item.type}", ${item.size}, "${item.key}");`;
    bytesList.push(bytesPiece);
  }

  const checks = checkList.join("\n");
  const bytes = bytesList.join("\n");

  return `
export function ${REQUEST_ENCODE_PREFIX_FUNCTION}${definition.name}(request: ${ATTESTATION_TYPE_PREFIX}${definition.name}) {
${checks}
	let bytes = "0x"
${bytes}
	return bytes;
}
`;
}

function genEncodeAttestationTypeCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
	return ${REQUEST_ENCODE_PREFIX_FUNCTION}${definition.name}(request as ${ATTESTATION_TYPE_PREFIX}${definition.name});`;
}

export function genRequestEncodeFunction(definitions: AttestationTypeScheme[]) {
  const attestationTypeCases = definitions.map((definition) => genEncodeAttestationTypeCase(definition)).join("");
  return `
export function ${REQUEST_ENCODE_PREFIX_FUNCTION}Request(request: ${ATTESTATION_TYPE_PREFIX}Type): string  {  
	switch(request.attestationType) {
${attestationTypeCases}
		default:
			throw new AttestationRequestEncodeError("Invalid attestation type");
	}
}
`;
}

function toUnprefixedBytesFunction() {
  return `
function toUnprefixedBytes(value: any, type: string, size: number, key: string) {
	let bytes = "";  
	switch (type) {
		case "AttestationType":
			bytes = unPrefix0x(toHex(value as number, size));
			break;
		case "NumberLike":
			bytes = unPrefix0x(toHex(value, size));
			break;
		case "SourceId":
			bytes = unPrefix0x(toHex(value as number, size));
			break;
		case "ByteSequenceLike":
			bytes =  unPrefix0x(toHex(value, size));
			break;
		default:
			throw new AttestationRequestEncodeError("Wrong type");
	}
	if(bytes.length > size * 2) {
		throw new AttestationRequestEncodeError("Too long byte string for key: " + key);
	}
	return bytes; 
}  
`;
}

export function createAttestationRequestEncode(definitions: AttestationTypeScheme[]) {
  const arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import { 
${arImports},
	${ATTESTATION_TYPE_PREFIX}Type 
} from "./attestation-request-types";
import { toHex, unPrefix0x } from "./attestation-request-parse";
import { AttestationType } from "./attestation-types-enum";

`;

  content += REQUEST_ENCODE_FUNCTIONS_HEADER;

  content += genEncodeException();

  content += toUnprefixedBytesFunction();

  definitions.forEach((definition) => {
    content += genRequestEncodeFunctionForDefinition(definition);
  });

  content += genRequestEncodeFunction(definitions);

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_REQUEST_ENCODE_FILE, prettyContent, "utf8");
}
