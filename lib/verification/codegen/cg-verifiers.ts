import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, DataHashScheme } from "../attestation-types/attestation-types";
import { getSourceName, tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATTESTATION_TYPE_PREFIX, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, SEMI_EDITABLE_GEN_FILE_HEADER, VERIFIER_FUNCTION_PREFIX } from "./cg-constants";
import { dashCapitalized, indentText, trimStartNewline } from "./cg-utils";

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

function randomHashItemValue(item: DataHashScheme) {
   let res =  `${item.key}: randSol(request, "${item.key}", "${item.type}") as ${tsTypeForSolidityType(item.type)}`
   return trimStartNewline(res);
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
   return content.slice(index+1);
}

export function genVerifier(definition: AttestationTypeScheme, sourceId: number, folder: string) {
   let functionName = verifierFunctionName(definition, sourceId);
   let responseFields = definition.dataHashDefinition.map(item => indentText(randomHashItemValue(item), CODEGEN_TAB)).join(",\n");
   let types = definition.dataHashDefinition.map(item => `"${item.type}",\t\t// ${item.key}`).join("\n");
   let values = definition.dataHashDefinition.map(item => `response.${item.key}`).join(",\n");
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

   let randomResponse = 
`
let response = {
${responseFields}      
} as ${DATA_HASH_TYPE_PREFIX}${definition.name};
`
let importedSymbols = [ `AR${definition.name}`, `BN`, `DH${definition.name}`, `IndexedQueryManager`, `parseRequestBytes`, `randSol`, `RPCInterface`, `TDEF_${dashCapitalized(definition.name, '_')}`, `Verification`, `VerificationStatus`, `Web3`];
importedSymbols.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));

   return `${SEMI_EDITABLE_GEN_FILE_HEADER}
import { ${importedSymbols.join(", ")} } from "./0imports";
${imports}

const web3 = new Web3();

export async function ${functionName}(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF_${dashCapitalized(definition.name, '_')}) as ${ATTESTATION_TYPE_PREFIX}${definition.name};

   //-$$$<start> of the custom code section. Do not change this comment. XXX

${code}

   //-$$$<end> of the custom section. Do not change this comment.

${hasResponseDefined ? "" : indentText(randomResponse, CODEGEN_TAB)}

   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint${ATT_BYTES*8}",
         "uint${CHAIN_ID_BYTES*8}",
${indentText(types, CODEGEN_TAB*3)}
      ],
      [
         response.attestationType,
         response.chainId,
${indentText(values, CODEGEN_TAB*3)}
      ]
   );   

   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<${DATA_HASH_TYPE_PREFIX}${definition.name}>;
}   
`
}
