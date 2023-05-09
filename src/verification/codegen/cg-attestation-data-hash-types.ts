import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme, DataHashScheme, RESPONSE_BASE_DEFINITIONS } from "../attestation-types/attestation-types";
import { tsTypeForItem } from "../attestation-types/attestation-types-helpers";
import { ATT_HASH_TYPES_FILE, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS } from "./cg-constants";
import { JSDocCommentText, OpenAPIOptionsResponses } from "./cg-utils";

export function BNProperty(comment?: string) {
  return `{type: "string", description: \`${comment ?? "String representation of number"}\`}`;
}

function descriptionObj(comment?: string) {
  return `{description: \`${comment ?? ""}\`}`;
}

function genDefHashItem(item: DataHashScheme, options?: OpenAPIOptionsResponses) {
  const annotation = options?.dto
    ? `\n@ApiProperty(${tsTypeForItem(item) === "BN" ? BNProperty(item.description) : descriptionObj(item.description)})`
    : "";
  return `${JSDocCommentText(item.description)}${annotation}
   ${item.key}: ${tsTypeForItem(item)};`;
}

function genAttestationDataHashType(definition: AttestationTypeScheme, options?: OpenAPIOptionsResponses) {
  if (options.verifierGenChecker && !options.verifierGenChecker.hasAttestationType(definition.id)) {
    return "";
  }
  const values = [...RESPONSE_BASE_DEFINITIONS, ...definition.dataHashDefinition].map((item) => genDefHashItem(item, options)).join("\n\n");
  return `
  export class ${DATA_HASH_TYPE_PREFIX}${definition.name} {
  ${options.dto ? "@ApiPropertyOptional()" : ""}
  /**
   * Merkle proof (a list of 32-byte hex hashes).
   */
  merkleProof?: string[];
   
  ${values}
  }
  `;
}

function dhType(definitions: AttestationTypeScheme[], options?: OpenAPIOptionsResponses) {
  const dhNames = definitions
    .filter((definition) => !options?.verifierGenChecker || options.verifierGenChecker.hasAttestationType(definition.id))
    .map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`);
  const dhTypes = dhNames.join(" | ");
  const dhUnionArray = dhNames.join(" , ");
  return `export type ${DATA_HASH_TYPE_PREFIX}Type = ${dhTypes};
  export const ${DATA_HASH_TYPE_PREFIX}TypeArray = [${dhUnionArray}];`;
}

export function createAttestationHashTypesFile(definitions: AttestationTypeScheme[], options?: OpenAPIOptionsResponses) {
  // Request types
  const openAPIImport = options?.dto ? 'import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";' : "";
  let content = `${DEFAULT_GEN_FILE_HEADER}
  ${openAPIImport}
  import BN from "bn.js";

  `;

  definitions.forEach((definition) => {
    content += genAttestationDataHashType(definition, options);
  });
  content += dhType(definitions, options);
  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  const fName = options?.filePath ?? ATT_HASH_TYPES_FILE;
  fs.writeFileSync(fName, prettyContent, "utf8");
}
