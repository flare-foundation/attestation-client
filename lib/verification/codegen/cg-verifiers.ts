import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { getSourceName } from "../sources/sources";
import { genRandomResponseCode } from "./cg-attestation-random-utils";
import {
  ATTESTATION_TYPE_PREFIX, DATA_HASH_TYPE_PREFIX,
  SEMI_EDITABLE_GEN_FILE_HEADER,
  VERIFIER_FUNCTION_PREFIX,
  WEB3_HASH_PREFIX_FUNCTION
} from "./cg-constants";
import { dashCapitalized } from "./cg-utils";

export function verifierFolder(sourceId: number, rootFolder?: string) {
  const root = rootFolder ? `${rootFolder}/` : "";
  return `${root}${getSourceName(sourceId)}`;
}
export function verifierFile(definition: AttestationTypeScheme, sourceId: number, folder?: string, addTs = true) {
  const root = folder ? `${folder}/` : "";
  const suffix = addTs ? ".ts" : "";
  const name = getSourceName(sourceId).toLowerCase();
  return `${root}v-${("" + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}.${name}${suffix}`;
}

export function verifierFunctionName(definition: AttestationTypeScheme, sourceId: number) {
  return `${VERIFIER_FUNCTION_PREFIX}${definition.name}${getSourceName(sourceId)}`;
}

function isResponseDefined(fileContent: string) {
  const res = /\n[^\n\/]*response\s*\=/g.test("\n" + fileContent);
  return res;
}

function extractImports(fileContent: string): string {
  const importRegex = /import [^\'\"]+['\"][^\'\"]+['\"]\;?/g;
  const defaultImportRegex = /import [^\'\"]+\".\/0imports\";/;
  const imports = fileContent.match(importRegex).filter((item) => !defaultImportRegex.test(item));
  return imports.join("\n");
}

function extractCode(fileContent: string): string {
  const codeRegex = /\n[^\n]*\/\/\-\$\$\$\<start\>[^\n]+\n([\s\S]*)\n[^\n]*\/\/\-\$\$\$\<end\>/;
  const matches = fileContent.match(codeRegex);
  // console.log(`"${matches[1]}"`)
  return matches[1].replace(/^\n+|\n+$/g, "");
}

function removeToFirstImport(content: string) {
  const index = content.indexOf("\nimport");
  return content.slice(index + 1);
}

export function genVerifier(definition: AttestationTypeScheme, sourceId: number, folder: string) {
  const functionName = verifierFunctionName(definition, sourceId);
  const mccInterface = `MCC.${getSourceName(sourceId)}`;
  let hasResponseDefined = false;
  const fname = verifierFile(definition, sourceId, folder);
  let fileContent = "";
  let imports = "";
  let code = "// TYPE THE CODE HERE";
  if (fs.existsSync(fname)) {
    fs.mkdirSync(folder, { recursive: true });
    fileContent = removeToFirstImport(fs.readFileSync(fname).toString());
    imports = extractImports(fileContent);
    code = extractCode(fileContent);
    hasResponseDefined = isResponseDefined(code);
  }

  const randomResponse = genRandomResponseCode(definition, "request");
  const importedSymbols = [
    `${ATTESTATION_TYPE_PREFIX}${definition.name}`,
    `Attestation`,
    `BN`,
    `${DATA_HASH_TYPE_PREFIX}${definition.name}`,
    `${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`,
    `IndexedQueryManager`,
    `parseRequest`,
    `randSol`,
    `MCC`,
    `Verification`,
    `VerificationStatus`,
    `Web3`,
  ];
  importedSymbols.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return `${SEMI_EDITABLE_GEN_FILE_HEADER}
import { ${importedSymbols.join(", ")} } from "./0imports";
${imports}

const web3 = new Web3();

export async function ${functionName}(
	client: ${mccInterface}, 
	attestation: Attestation, 
	indexer: IndexedQueryManager, 
	recheck = false
): Promise<Verification<${ATTESTATION_TYPE_PREFIX}${definition.name}, ${DATA_HASH_TYPE_PREFIX}${definition.name}>>
{
	const request = parseRequest(attestation.data.request) as ${ATTESTATION_TYPE_PREFIX}${definition.name};
	const roundId = attestation.roundId;
	const numberOfConfirmations = attestation.numberOfConfirmationBlocks;

	//-$$$<start> of the custom code section. Do not change this comment.

${code}

	//-$$$<end> of the custom section. Do not change this comment.

${hasResponseDefined ? "" : randomResponse}

	const hash = ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request, response);

	return {
		hash,
		request,
		response,
		status: VerificationStatus.OK
	}
}   
`;
}
