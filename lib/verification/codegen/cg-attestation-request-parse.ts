import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, SOURCE_ID_BYTES, SupportedRequestType } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQUEST_PARSE_FILE, CODEGEN_TAB, DEFAULT_GEN_FILE_HEADER, REQUEST_PARSE_FUNCTIONS_HEADER, REQUEST_PARSE_PREFIX_FUNCTION } from "./cg-constants";
import { indentText, tab } from "./cg-utils";


export function genRequestParseFunctionForDefinition(definition: AttestationTypeScheme) {
  let parseEntryList: string[] = [];

  let start = 0;
  let totalLength = definition.request.map(item => item.size * 2).reduce((a, b) => a + b);

  for (let item of definition.request) {
    let end = start + item.size * 2;
    parseEntryList.push(`${item.key}: fromUnprefixedBytes(input.slice(${start}, ${end}), "${item.type}", ${item.size}) as ${typeForRequestType(item.type)}`);
    start = end;
  }
  let parseEntries = parseEntryList.join(",\n");
  return `
export function ${REQUEST_PARSE_PREFIX_FUNCTION}${definition.name}(bytes: string): ${ATTESTATION_TYPE_PREFIX}${definition.name} {
${tab()}if(!bytes) {
${tab()}${tab()}throw new AttestationRequestParseError("Empty attestation request")
${tab()}}
${tab()}let input = unPrefix0x(bytes);  
${tab()}if(input.length != ${totalLength}) {
${tab()}${tab()}throw new AttestationRequestParseError("Incorrectly formated attestation request")
${tab()}}
  
${tab()}return {
${indentText(parseEntries, CODEGEN_TAB * 2)}
${tab()}}
}
`
}

function typeForRequestType(type: SupportedRequestType) {
  switch (type) {
    case "AttestationType":
    case "SourceId":
      return type;
    case "NumberLike":
      return "BN"
    case "ByteSequenceLike":
      return "string";
    default:
      ((_: never): void => { })(type);
  }
}



function fromUnprefixedBytesFunction() {
  return `
function fromUnprefixedBytes(bytes: string, type: string, size: number) {
${tab()}switch (type) {
${tab()}${tab()}case "AttestationType":
${tab()}${tab()}${tab()}return toBN(prefix0x(bytes)).toNumber() as AttestationType;
${tab()}${tab()}case "NumberLike":
${tab()}${tab()}${tab()}return toBN(prefix0x(bytes));
${tab()}${tab()}case "SourceId":
${tab()}${tab()}${tab()}return toBN(prefix0x(bytes)).toNumber() as SourceId;
${tab()}${tab()}case "ByteSequenceLike":
${tab()}${tab()}${tab()}return toHex(prefix0x(bytes), size);
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new AttestationRequestParseError("Unsuported attestation request");
${tab()}}
}
`
}

function genParseAttestationTypeCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
${tab()}return ${REQUEST_PARSE_PREFIX_FUNCTION}${definition.name}(bytes);`
}

export function genRequestParseFunction(definitions: AttestationTypeScheme[]) {
  let attestationTypeCases = definitions.map(definition => genParseAttestationTypeCase(definition)).join("");
  return `
export function ${REQUEST_PARSE_PREFIX_FUNCTION}Request(bytes: string): ${ATTESTATION_TYPE_PREFIX}Type {  
${tab()}let { attestationType } = getAttestationTypeAndSource(bytes);
${tab()}switch(attestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB * 2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new AttestationRequestParseError("Invalid attestation type");
${tab()}}
}
`
}

function genParseException() {
  return `
export class AttestationRequestParseError extends Error {
${tab()}constructor(message) {
${tab()}${tab()}super(message);
${tab()}${tab()}this.name = 'AttestationRequestParseError';
${tab()}}
}
`
}

function genGetAttestationTypeAndSource() {
  return `
export function getAttestationTypeAndSource(bytes: string) {
${tab()}try {
${tab()}${tab()}let input = unPrefix0x(bytes);
${tab()}${tab()}if (!bytes || bytes.length < ${ATT_BYTES * 2 + SOURCE_ID_BYTES * 2}) {
${tab()}${tab()}${tab()}throw new AttestationRequestParseError("Cannot read attestation type and source id")
${tab()}${tab()}}
${tab()}${tab()}return {
${tab()}${tab()}${tab()}attestationType: toBN(prefix0x(input.slice(0, ${ATT_BYTES * 2}))).toNumber() as AttestationType,
${tab()}${tab()}${tab()}sourceId: toBN(prefix0x(input).slice(${ATT_BYTES * 2}, ${ATT_BYTES * 2 + SOURCE_ID_BYTES * 2})).toNumber() as SourceId
${tab()}${tab()}}
${tab()}} catch(e) {
${tab()}${tab()}throw new AttestationRequestParseError(e)
${tab()}}
}
  
`
}

function genHelperFunctions() {
  return `
export function unPrefix0x(tx: string) {
${tab()}return tx.startsWith("0x") ? tx.slice(2) : tx;
}

export function prefix0x(tx: string) {
${tab()}return tx.startsWith("0x") ? tx : "0x" + tx;
}

export function toHex(x: string | number | BN, padToBytes?: number) {
${tab()}if (padToBytes as any > 0) {
${tab()}${tab()}return Web3.utils.leftPad(Web3.utils.toHex(x), padToBytes! * 2);
${tab()}}
${tab()}return Web3.utils.toHex(x);
}
`
}

export function createAttestationRequestParse(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map(definition => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n")

  let content = `${DEFAULT_GEN_FILE_HEADER}
import Web3 from "web3";
import { 
${indentText(arImports, CODEGEN_TAB)},
${tab()}${ATTESTATION_TYPE_PREFIX}Type 
} from "./attestation-request-types";
import { AttestationType } from "./attestation-types-enum";
import { SourceId } from "../sources/sources";

const toBN = Web3.utils.toBN;
const web3 = new Web3();
`;

  content += REQUEST_PARSE_FUNCTIONS_HEADER;

  content += genParseException();

  content += genHelperFunctions()

  content += fromUnprefixedBytesFunction();

  content += genGetAttestationTypeAndSource();

  definitions.forEach(definition => {
    content += genRequestParseFunctionForDefinition(definition);
  })

  content += genRequestParseFunction(definitions);

  fs.writeFileSync(ATT_REQUEST_PARSE_FILE, content, "utf8");
}
