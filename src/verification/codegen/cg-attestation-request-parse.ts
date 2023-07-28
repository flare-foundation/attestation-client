import fs from "fs";
import prettier from "prettier";
import {
  AttestationTypeScheme,
  ATT_BYTES,
  MIC_BYTES,
  SOURCE_ID_BYTES,
  SupportedRequestType,
  REQUEST_BASE_DEFINITIONS,
} from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_REQUEST_PARSE_FILE,
  DEFAULT_GEN_FILE_HEADER,
  PRETTIER_SETTINGS,
  REQUEST_PARSE_FUNCTIONS_HEADER,
  REQUEST_PARSE_PREFIX_FUNCTION,
} from "./cg-constants";

export function genRequestParseFunctionForDefinition(definition: AttestationTypeScheme) {
  const parseEntryList: string[] = [];

  let start = 0;
  const totalLength = [...REQUEST_BASE_DEFINITIONS, ...definition.request].map((item) => item.size * 2).reduce((a, b) => a + b);

  for (const item of [...REQUEST_BASE_DEFINITIONS, ...definition.request]) {
    const end = start + item.size * 2;
    parseEntryList.push(`${item.key}: fromUnprefixedBytes(input.slice(${start}, ${end}), "${item.type}", ${item.size}) as ${typeForRequestType(item.type)}`);
    start = end;
  }
  const parseEntries = parseEntryList.join(",\n");
  return `
/**
 * Parses an attestation request of type ${definition.name} from byte string @param bytes to object of type ${ATTESTATION_TYPE_PREFIX}${definition.name}
 */
export function ${REQUEST_PARSE_PREFIX_FUNCTION}${definition.name}(bytes: string): ${ATTESTATION_TYPE_PREFIX}${definition.name} {
	if(!bytes) {
		throw new AttestationRequestParseError("Empty attestation request")
	}
	const input = unPrefix0x(bytes);  
	if(input.length != ${totalLength}) {
		throw new AttestationRequestParseError("Incorrectly formatted attestation request")
	}
  
	return {
${parseEntries}
	}
}
`;
}

function typeForRequestType(type: SupportedRequestType) {
  switch (type) {
    case "AttestationType":
    case "SourceId":
      return type;
    case "NumberLike":
      return "BN";
    case "ByteSequenceLike":
      return "string";
    default:
      ((_: never): void => {})(type);
  }
}

function fromUnprefixedBytesFunction() {
  return `
function fromUnprefixedBytes(bytes: string, type: string, size: number) {
	switch (type) {
		case "AttestationType":
			return toBN(prefix0x(bytes)).toNumber() as AttestationType;
		case "NumberLike":
			return toBN(prefix0x(bytes));
		case "SourceId":
			return toBN(prefix0x(bytes)).toNumber() as SourceId;
		case "ByteSequenceLike":
			return toHex(prefix0x(bytes), size);
		default:
			throw new AttestationRequestParseError("Unsuported attestation request");
	}
}
`;
}

function genParseAttestationTypeCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
	return ${REQUEST_PARSE_PREFIX_FUNCTION}${definition.name}(bytes);`;
}

export function genRequestParseFunction(definitions: AttestationTypeScheme[]) {
  const attestationTypeCases = definitions.map((definition) => genParseAttestationTypeCase(definition)).join("");
  return `
/**
 * Parses an attestation request from byte string @param bytes to object of type ${ATTESTATION_TYPE_PREFIX}Type
 */
export function ${REQUEST_PARSE_PREFIX_FUNCTION}Request(bytes: string): ${ATTESTATION_TYPE_PREFIX}Type {  
	const { attestationType } = getAttestationTypeAndSource(bytes);
	switch(attestationType) {
${attestationTypeCases}
		default:
			throw new AttestationRequestParseError("Invalid attestation type");
	}
}
`;
}

function genParseException() {
  return `
export class AttestationRequestParseError extends Error {
	constructor(message: any) {
		super(message);
		this.name = 'AttestationRequestParseError'; 
	}
}
`;
}

function genGetAttestationTypeAndSource() {
  return `
export function getAttestationTypeAndSource(bytes: string) {
	try {
		const input = unPrefix0x(bytes);
		if (!bytes || bytes.length < ${ATT_BYTES * 2 + SOURCE_ID_BYTES * 2}) {
			throw new AttestationRequestParseError("Cannot read attestation type and source id")
		}
		return {
			attestationType: toBN(prefix0x(input.slice(0, ${ATT_BYTES * 2}))).toNumber() as AttestationType,
			sourceId: toBN(prefix0x(input.slice(${ATT_BYTES * 2}, ${ATT_BYTES * 2 + SOURCE_ID_BYTES * 2}))).toNumber() as SourceId,
			messageIntegrityCode: prefix0x(input.slice(${ATT_BYTES * 2 + SOURCE_ID_BYTES * 2}, ${ATT_BYTES * 2 + SOURCE_ID_BYTES * 2 + MIC_BYTES * 2}))
		} as ARBase;
	} catch(e) {
		throw new AttestationRequestParseError(e)
	}
}
  
`;
}

function genHelperFunctions() {
  return `
export function unPrefix0x(tx: string) {
	if (!tx) {
	  return "0x0";
	} else if (tx.startsWith("0x") || tx.startsWith("0X")) {
	  return tx.slice(2);
	}
	return tx;
 }
 
 export function prefix0x(tx: string) {
	if (!tx) {
	  return "0x0";
	} else if (tx.startsWith("0x") || tx.startsWith("0X")) {
	  return tx;
	}
	return "0x" + tx;
 }
 
export function toHex(x: string | number | BN, padToBytes?: number) {
	const hexValue = Web3.utils.toHex(x);
	if (hexValue.startsWith("-")) {
	  throw new AttestationRequestParseError("Negative values are not supported in attestation requests");
	}
	if ((padToBytes as any) > 0) {
	  return Web3.utils.leftPad(Web3.utils.toHex(x), padToBytes! * 2);
	}
	return hexValue;
 } 
`;
}

export function createAttestationRequestParse(definitions: AttestationTypeScheme[]) {
  const arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");

  let content = `${DEFAULT_GEN_FILE_HEADER}
import Web3 from "web3";
import BN from "bn.js";
import { 
${arImports},
	${ATTESTATION_TYPE_PREFIX}Type,
	ARBase,
} from "./attestation-request-types";
import { AttestationType } from "./attestation-types-enum";
import { SourceId } from "../sources/sources";

const toBN = Web3.utils.toBN;
const web3 = new Web3();
`;

  content += REQUEST_PARSE_FUNCTIONS_HEADER;

  content += genParseException();

  content += genHelperFunctions();

  content += fromUnprefixedBytesFunction();

  content += genGetAttestationTypeAndSource();

  definitions.forEach((definition) => {
    content += genRequestParseFunctionForDefinition(definition);
  });

  content += genRequestParseFunction(definitions);

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_REQUEST_PARSE_FILE, prettyContent, "utf8");
}
