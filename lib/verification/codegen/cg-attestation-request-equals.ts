import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQUEST_EQUALS_FILE, CODEGEN_TAB, DEFAULT_GEN_FILE_HEADER, REQUEST_ENCODE_FUNCTIONS_HEADER, REQUEST_EQUALS_PREFIX_FUNCTION } from "./cg-constants";
import { indentText, tab } from "./cg-utils";

function genEqualsException() {
  return `
export class AttestationRequestEqualsError extends Error {
${tab()}constructor(message) {
${tab()}${tab()}super(message);
${tab()}${tab()}this.name = 'AttestationRequestEqualsError';
${tab()}}
}
`
}

export function genRequestEqualsFunctionForDefinition(definition: AttestationTypeScheme) {
  let checkList = [];

  for (let item of definition.request) {

    let check = `if(!assertEqualsByScheme(request1.${item.key}, request2.${item.key}, "${item.type}")) {
${tab()}return false;
}`
    checkList.push(check);
  }
  let checks = checkList.join("\n")

  return `
export function ${REQUEST_EQUALS_PREFIX_FUNCTION}${definition.name}(request1: ${ATTESTATION_TYPE_PREFIX}${definition.name}, request2: ${ATTESTATION_TYPE_PREFIX}${definition.name}) {
${indentText(checks, CODEGEN_TAB)}
${tab()}return true;
}
`
}

function genEqualsAttestationTypeCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
${tab()}return ${REQUEST_EQUALS_PREFIX_FUNCTION}${definition.name}(request1 as ${ATTESTATION_TYPE_PREFIX}${definition.name}, request2 as ${ATTESTATION_TYPE_PREFIX}${definition.name});`
}

export function genRequestEqualsFunction(definitions: AttestationTypeScheme[]) {
  let attestationTypeCases = definitions.map(definition => genEqualsAttestationTypeCase(definition)).join("");
  return `
export function ${REQUEST_EQUALS_PREFIX_FUNCTION}Request(request1: ${ATTESTATION_TYPE_PREFIX}Type, request2: ${ATTESTATION_TYPE_PREFIX}Type): boolean  {  
${tab()}if(request1.attestationType != request2.attestationType) {
${tab()}${tab()}return false;
${tab()}}
${tab()}switch(request1.attestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new AttestationRequestEqualsError("Invalid attestation type");
${tab()}}
}
`
}


function assertEqualsBySchemeFunction() {
  return `
export function assertEqualsByScheme(a: any, b: any, type: string) {
${tab()}switch (type) {
${tab()}${tab()}case "AttestationType":
${tab()}${tab()}${tab()}return a === b;
${tab()}${tab()}case "NumberLike":
${tab()}${tab()}${tab()}return toBN(a).eq(toBN(b));
${tab()}${tab()}case "SourceId":
${tab()}${tab()}${tab()}return a === b;
${tab()}${tab()}case "ByteSequenceLike":
${tab()}${tab()}${tab()}return a === b;
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new AttestationRequestEqualsError("Wrong type")      
${tab()}}
}
`
}


export function createAttestationRequestEquals(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map(definition => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n")

  let content = `${DEFAULT_GEN_FILE_HEADER}
import Web3 from "web3";  
import { 
${indentText(arImports, CODEGEN_TAB)},
${tab()}${ATTESTATION_TYPE_PREFIX}Type 
} from "./attestation-request-types";
import { AttestationType } from "./attestation-types-enum";

const toBN = Web3.utils.toBN;
`;

  content += REQUEST_ENCODE_FUNCTIONS_HEADER;

  content += genEqualsException();

  content += assertEqualsBySchemeFunction();

  definitions.forEach(definition => {
    content += genRequestEqualsFunctionForDefinition(definition);
  })

  content += genRequestEqualsFunction(definitions);

  fs.writeFileSync(ATT_REQUEST_EQUALS_FILE, content, "utf8");
}
