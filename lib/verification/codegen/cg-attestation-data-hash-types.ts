import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATT_HASH_TYPES_FILE, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS } from "./cg-constants";
import { commentText } from "./cg-utils";

function genDefHashItem(item: DataHashScheme) {
  return `${commentText(item.description)}
   ${item.key}: ${tsTypeForSolidityType(item.type)};`;
}

function genAttestationDataHashType(definition: AttestationTypeScheme) {
  const values = definition.dataHashDefinition.map((item) => genDefHashItem(item)).join("\n\n");
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
  const dhTypes = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(" | ");
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
  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_HASH_TYPES_FILE, prettyContent, "utf8");
}
