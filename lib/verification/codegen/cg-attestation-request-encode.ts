import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_REQUEST_ENCODE_FILE,
  CODEGEN_TAB,
  DEFAULT_GEN_FILE_HEADER,
  REQUEST_ENCODE_FUNCTIONS_HEADER,
  REQUEST_ENCODE_PREFIX_FUNCTION,
  REQUEST_PARSE_PREFIX_FUNCTION,
} from "./cg-constants";
import { indentText, tab } from "./cg-utils";

function genEncodeException() {
  return `
export class AttestationRequestEncodeError extends Error {
${tab()}constructor(message: any) {
${tab()}${tab()}super(message);
${tab()}${tab()}this.name = 'AttestationRequestEncodeError';
${tab()}}
}
`;
}

export function genRequestEncodeFunctionForDefinition(definition: AttestationTypeScheme) {
  let checkList = [];
  let bytesList = [];

  for (let item of definition.request) {
    let check = `if(request.${item.key} == null) {
${tab()}throw new AttestationRequestEncodeError("Missing '${item.key}'")
}`;
    checkList.push(check);
    let bytesPiece = `bytes += toUnprefixedBytes(request.${item.key}, "${item.type}", ${item.size}, "${item.key}");`;
    bytesList.push(bytesPiece);
  }

  let checks = checkList.join("\n");
  let bytes = bytesList.join("\n");

  return `
export function ${REQUEST_ENCODE_PREFIX_FUNCTION}${definition.name}(request: ${ATTESTATION_TYPE_PREFIX}${definition.name}) {
${indentText(checks, CODEGEN_TAB)}
${tab()}let bytes = "0x"
${indentText(bytes, CODEGEN_TAB)}
${tab()}return bytes;
}
`;
}

function genEncodeAttestationTypeCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
${tab()}return ${REQUEST_ENCODE_PREFIX_FUNCTION}${definition.name}(request as ${ATTESTATION_TYPE_PREFIX}${definition.name});`;
}

export function genRequestEncodeFunction(definitions: AttestationTypeScheme[]) {
  let attestationTypeCases = definitions.map((definition) => genEncodeAttestationTypeCase(definition)).join("");
  return `
export function ${REQUEST_ENCODE_PREFIX_FUNCTION}Request(request: ${ATTESTATION_TYPE_PREFIX}Type): string  {  
${tab()}switch(request.attestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new AttestationRequestEncodeError("Invalid attestation type");
${tab()}}
}
`;
}

function toUnprefixedBytesFunction() {
  return `
function toUnprefixedBytes(value: any, type: string, size: number, key: string) {
${tab()}let bytes = "";  
${tab()}switch (type) {
${tab()}${tab()}case "AttestationType":
${tab()}${tab()}${tab()}bytes = unPrefix0x(toHex(value as number, size));
${tab()}${tab()}${tab()}break;
${tab()}${tab()}case "NumberLike":
${tab()}${tab()}${tab()}bytes = unPrefix0x(toHex(value, size));
${tab()}${tab()}${tab()}break;
${tab()}${tab()}case "SourceId":
${tab()}${tab()}${tab()}bytes = unPrefix0x(toHex(value as number, size));
${tab()}${tab()}${tab()}break;
${tab()}${tab()}case "ByteSequenceLike":
${tab()}${tab()}${tab()}bytes =  unPrefix0x(toHex(value, size));
${tab()}${tab()}${tab()}break;
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new AttestationRequestEncodeError("Wrong type");
${tab()}}
${tab()}if(bytes.length > size * 2) {
${tab()}${tab()}throw new AttestationRequestEncodeError("Too long byte string for key: " + key);
${tab()}}
${tab()}return bytes; 
}  
`;
}

export function createAttestationRequestEncode(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import { 
${indentText(arImports, CODEGEN_TAB)},
${tab()}${ATTESTATION_TYPE_PREFIX}Type 
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

  fs.writeFileSync(ATT_REQUEST_ENCODE_FILE, content, "utf8");
}
