import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPES_ENUM_FILE, DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS } from "./cg-constants";

function genAttestationTypeEnum(definitions: AttestationTypeScheme[]): string {
  const values = definitions.map((definition) => `${definition.name} = ${definition.id}`).join(",\n");
  return `
export enum AttestationType {
${values}
}
/**
 * Returns attestation type name for an attestation type enum
 * @param attestationType: number 
 */
export function getAttestationTypeName(attestationType: number): string {
  if (attestationType == null || !AttestationType[attestationType]) {
    return null;
  }
  return AttestationType[attestationType];
}
`;
}

export function createAttestationEnumFile(definitions: AttestationTypeScheme[]) {
  // Enum file
  let content = DEFAULT_GEN_FILE_HEADER;
  content += genAttestationTypeEnum(definitions);
  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATTESTATION_TYPES_ENUM_FILE, prettyContent, "utf8");
}
