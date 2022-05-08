import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { SourceId } from "../sources/sources";
import { ATTESTATION_TYPE_PREFIX, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, VERIFIERS_ROOT, WEB3_HASH_PREFIX_FUNCTION } from "./cg-constants";
import { dashCapitalized, definitionFile, indentText } from "./cg-utils";
import { verifierFolder } from "./cg-verifiers";

export function createVerifiersImportFileForSource(definitions: AttestationTypeScheme[], chainType: SourceId) {

   let tdefImports = "";
   let tdefExports = "";
   let dhTypeList = [];
   let arTypeList = [];
   let hashFunctionList = []

   for(let definition of definitions) {
      if(definition.supportedSources.indexOf(chainType) >= 0) {
         tdefImports += `import {TDEF as TDEF_${dashCapitalized(definition.name, '_')} } from "../../attestation-types/${definitionFile(definition, undefined, false)}";\n`
         tdefExports += `export { TDEF_${dashCapitalized(definition.name, '_')} };\n`
      }
      dhTypeList.push(`${DATA_HASH_TYPE_PREFIX}${definition.name}`);
      arTypeList.push(`${ATTESTATION_TYPE_PREFIX}${definition.name}`);
      hashFunctionList.push(`${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`);
   } 
   let dhTypes = dhTypeList.join(",\n");
   let arTypes = arTypeList.join(",\n");
   let hashFunctions = hashFunctionList.join(",\n");

   let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";
export { Attestation } from "../../../attester/Attestation";
${tdefImports}
export { RPCInterface, MCC } from "flare-mcc";
export { IndexedQueryManager } from "../../../indexed-query-manager/IndexedQueryManager";
export { Verification, VerificationStatus } from "../../attestation-types/attestation-types";
export { randSol } from "../../attestation-types/attestation-types-helpers";
export { parseRequest } from "../../generated/attestation-request-parse";
export { 
${indentText(dhTypes, CODEGEN_TAB)} 
} from "../../generated/attestation-hash-types";
export { 
${indentText(arTypes, CODEGEN_TAB)} 
} from "../../generated/attestation-request-types";
export { 
${indentText(hashFunctions, CODEGEN_TAB)} 
} from "../../generated/attestation-hash-utils";
export { BN };
export { Web3 };
${tdefExports}
`;
   fs.writeFileSync(`${verifierFolder(chainType, VERIFIERS_ROOT)}/0imports.ts`, content, "utf8");
}


export function createVerifiersImportFiles(definitions: AttestationTypeScheme[]) {
   let sourceIds = new Set<SourceId>();
   for(let definition of definitions) {
      for(let cType of definition.supportedSources) {
         sourceIds.add(cType);
      }
   }
   for(let cType of sourceIds) {
      createVerifiersImportFileForSource(definitions, cType);
   }
}