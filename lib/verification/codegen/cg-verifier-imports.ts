import { ChainType } from "flare-mcc";
import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { DEFAULT_GEN_FILE_HEADER, VERIFIERS_ROOT } from "./cg-constants";
import { dashCapitalized, definitionFile } from "./cg-utils";
import { verifierFolder } from "./cg-verifiers";

export function createVerifiersImportFileForSource(definitions: AttestationTypeScheme[], chainType: ChainType) {

   let tdefImports = "";
   let tdefExports = "";
   let dhTypeList = [];
   let arTypeList = []
   for(let definition of definitions) {
      if(definition.supportedSources.indexOf(chainType) >= 0) {
         tdefImports += `import {TDEF as TDEF_${dashCapitalized(definition.name, '_')} } from "../../attestation-types/${definitionFile(definition, undefined, false)}";\n`
         tdefExports += `export { TDEF_${dashCapitalized(definition.name, '_')} };\n`
      }
      dhTypeList.push(`DH${definition.name}`);
      arTypeList.push(`AR${definition.name}`);
   } 
   let dhTypes = dhTypeList.join(", ");
   let arTypes = arTypeList.join(", ");

   let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";
${tdefImports}
export { RPCInterface } from "flare-mcc";
export { IndexedQueryManager } from "../../../indexed-query-manager/IndexedQueryManager";
export { Verification, VerificationStatus } from "../../attestation-types/attestation-types";
export { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
export { ${dhTypes} } from "../../generated/attestation-hash-types";
export { ${arTypes} } from "../../generated/attestation-request-types";
export { BN };
export { Web3 };
${tdefExports}
`;
   fs.writeFileSync(`${verifierFolder(chainType, VERIFIERS_ROOT)}/0imports.ts`, content, "utf8");
}


export function createVerifiersImportFiles(definitions: AttestationTypeScheme[]) {
   let sourceIds = new Set<ChainType>();
   for(let definition of definitions) {
      for(let cType of definition.supportedSources) {
         sourceIds.add(cType);
      }
   }
   for(let cType of sourceIds) {
      createVerifiersImportFileForSource(definitions, cType);
   }
}