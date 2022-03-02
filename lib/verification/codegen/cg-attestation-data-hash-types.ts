import fs from "fs";
import { AttestationTypeScheme, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATT_HASH_TYPES_FILE, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER } from "./cg-constants";

function genDefHashItem(item: DataHashScheme) {
   return `   ${item.key}: ${tsTypeForSolidityType(item.type)};`
}

function genAttestationDataHashType(definition: AttestationTypeScheme) {
   let values = definition.dataHashDefinition.map(item => genDefHashItem(item)).join("\n");
   return `
export interface ${DATA_HASH_TYPE_PREFIX}${definition.name} {
${values}
}`
}

export function createAttestationHashTypesFile(definitions: AttestationTypeScheme[]) {
   // Request types
   let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
`;

   definitions.forEach(definition => {
      content += genAttestationDataHashType(definition);
   })
   fs.writeFileSync(ATT_HASH_TYPES_FILE, content, "utf8");
}
