import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATT_HASH_TYPES_FILE, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS } from "./cg-constants";
import { commentText } from "./cg-utils";

export function BNProperty() {
  return `{type: "string", description:"String representation of number"}`;
}

function genDefHashItem(item: DataHashScheme) {
  return `${commentText(item.description)}
   @ApiProperty(${tsTypeForSolidityType(item.type) === "BN" ? BNProperty() : ""})
   ${item.key}: ${tsTypeForSolidityType(item.type)};`;
}

function genAttestationDataHashType(definition: AttestationTypeScheme) {
  const values = definition.dataHashDefinition.map((item) => genDefHashItem(item)).join("\n\n");
  return `
  export class ${DATA_HASH_TYPE_PREFIX}${definition.name} {
  // Attestation type
  @ApiPropertyOptional()
  stateConnectorRound?: number;
  @ApiPropertyOptional()
  merkleProof?: string[];
   
  ${values}
  }
  `;
}

function dhType(definitions: AttestationTypeScheme[]) {
  const dhNames = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`);
  const dhTypes = dhNames.join(" | ");
  const dhUnionArray = dhNames.join(" , ");
  return `export type ${DATA_HASH_TYPE_PREFIX}Type = ${dhTypes};
  export const ${DATA_HASH_TYPE_PREFIX}TypeArray = [${dhUnionArray}];`;
}

export function createAttestationHashTypesFile(definitions: AttestationTypeScheme[]) {
  // Request types
  let content = `${DEFAULT_GEN_FILE_HEADER}
  import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
  import BN from "bn.js";

  `;

  definitions.forEach((definition) => {
    content += genAttestationDataHashType(definition);
  });
  content += dhType(definitions);
  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_HASH_TYPES_FILE, prettyContent, "utf8");
}
