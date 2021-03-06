import fs from "fs";
import { AttestationTypeScheme, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATT_HASH_TYPES_FILE, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER } from "./cg-constants";
import { indentText } from "./cg-utils";

function genDefHashItem(item: DataHashScheme) {
  return `${indentText(item.description, CODEGEN_TAB, "//")}
   ${item.key}: ${tsTypeForSolidityType(item.type)};`;
}

function genAttestationDataHashType(definition: AttestationTypeScheme) {
  let values = definition.dataHashDefinition.map((item) => genDefHashItem(item)).join("\n\n");
  return `
export interface ${DATA_HASH_TYPE_PREFIX}${definition.name} {
   // Attestation type
   stateConnectorRound: number;
   merkleProof?: string[];
   
${values}
}
`;
}

function dhType(definitions: AttestationTypeScheme[]) {
  let dhTypes = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(" | ");
  return `export type ${DATA_HASH_TYPE_PREFIX}Type = ${dhTypes};`;
}

export function createAttestationHashTypesFile(definitions: AttestationTypeScheme[]) {
  // Request types
  let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";

`;

  definitions.forEach((definition) => {
    content += genAttestationDataHashType(definition);
  });
  content += dhType(definitions);
  fs.writeFileSync(ATT_HASH_TYPES_FILE, content, "utf8");
}
