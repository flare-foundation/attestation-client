import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES } from "../attestation-types/attestation-types";
import { getSourceName } from "../attestation-types/attestation-types-helpers";
import { genRandomResponseCode } from "./cg-attestation-utils";
import { ATTESTATION_TYPE_PREFIX, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, SEMI_EDITABLE_GEN_FILE_HEADER, VERIFIER_FUNCTION_PREFIX, WEB3_HASH_PREFIX_FUNCTION } from "./cg-constants";
import { dashCapitalized, indentText, tab } from "./cg-utils";

export function verifierFolder(sourceId: number, rootFolder?: string) {
   let root = rootFolder ? `${rootFolder}/` : "";
   return `${root}${getSourceName(sourceId)}`
}
export function verifierFile(definition: AttestationTypeScheme, sourceId: number, folder?: string, addTs = true) {
   let root = folder ? `${folder}/` : "";
   let suffix = addTs ? ".ts" : "";
   let name = getSourceName(sourceId).toLowerCase()
   return `${root}v-${('' + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}.${name}${suffix}`
}

export function verifierFunctionName(definition: AttestationTypeScheme, sourceId: number) {
   return `${VERIFIER_FUNCTION_PREFIX}${definition.name}${getSourceName(sourceId)}`;
}

function isResponseDefined(fileContent: string) {
   let res = /\n[^\n\/]*response\s*\=/g.test("\n" + fileContent);
   return res
}

function extractImports(fileContent: string): string {
   let importRegex = /import [^\'\"]+['\"][^\'\"]+['\"]\;?/g;
   let defaultImportRegex = /import [^\'\"]+\".\/0imports\";/;
   let imports = fileContent.match(importRegex).filter(item => !defaultImportRegex.test(item))
   return imports.join("\n")
}

function extractCode(fileContent: string): string {
   let codeRegex = /\n[^\n]*\/\/\-\$\$\$\<start\>[^\n]+\n([\s\S]*)\n[^\n]*\/\/\-\$\$\$\<end\>/
   let matches = fileContent.match(codeRegex);
   // console.log(`"${matches[1]}"`)
   return matches[1].replace(/^\n+|\n+$/g, '')
}


function removeToFirstImport(content: string) {
   let index = content.indexOf("\nimport")
   return content.slice(index + 1);
}

export function genVerifier(definition: AttestationTypeScheme, sourceId: number, folder: string) {
   let functionName = verifierFunctionName(definition, sourceId);
   let mccInterface = `MCC.${getSourceName(sourceId)}`
   let hasResponseDefined = false;
   let fname = verifierFile(definition, sourceId, folder);
   let fileContent: string = "";
   let imports = "";
   let code = "// TYPE THE CODE HERE";
   if (fs.existsSync(fname)) {
      fs.mkdirSync(folder, { recursive: true });
      fileContent = removeToFirstImport(fs.readFileSync(fname).toString());
      imports = extractImports(fileContent);
      code = extractCode(fileContent);
      hasResponseDefined = isResponseDefined(code);
   }

   let randomResponse = genRandomResponseCode(definition, "request");
   let importedSymbols = [`${ATTESTATION_TYPE_PREFIX}${definition.name}`, `Attestation`, `BN`, `${DATA_HASH_TYPE_PREFIX}${definition.name}`, 
   `${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`, `IndexedQueryManager`, `parseRequestBytes`, `randSol`, `MCC`, `TDEF_${dashCapitalized(definition.name, '_')}`, `Verification`, `VerificationStatus`, `Web3`];
   importedSymbols.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

   return `${SEMI_EDITABLE_GEN_FILE_HEADER}
import { ${importedSymbols.join(", ")} } from "./0imports";
${imports}

const web3 = new Web3();

export async function ${functionName}(client: ${mccInterface}, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
${tab()}let request = parseRequestBytes(attestation.data.request, TDEF_${dashCapitalized(definition.name, '_')}) as ${ATTESTATION_TYPE_PREFIX}${definition.name};
${tab()}let roundId = attestation.round.roundId;
${tab()}let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

${tab()}//-$$$<start> of the custom code section. Do not change this comment. XXX

${code}

${tab()}//-$$$<end> of the custom section. Do not change this comment.

${hasResponseDefined ? "" : indentText(randomResponse, CODEGEN_TAB)}

${tab()}let hash = ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request, response);

${tab()}return {
${tab()}${tab()}hash,
${tab()}${tab()}request,
${tab()}${tab()}response,
${tab()}${tab()}status: VerificationStatus.OK
${tab()}} as Verification<${ATTESTATION_TYPE_PREFIX}${definition.name}, ${DATA_HASH_TYPE_PREFIX}${definition.name}>;
}   
`
}
