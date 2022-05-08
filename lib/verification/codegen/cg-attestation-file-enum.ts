import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPES_ENUM_FILE, CODEGEN_TAB, DEFAULT_GEN_FILE_HEADER } from "./cg-constants";
import { indentText, tab } from "./cg-utils";

function genAttestationTypeEnum(definitions: AttestationTypeScheme[]): string {
   let values = definitions.map(definition => `${definition.name} = ${definition.id}`).join(",\n")
   return `
export enum AttestationType {
${indentText(values, CODEGEN_TAB)}
}
`
}

export function createAttestationEnumFile(definitions: AttestationTypeScheme[]) {
   // Enum file
   let content = DEFAULT_GEN_FILE_HEADER;
   content += genAttestationTypeEnum(definitions);
   fs.writeFileSync(ATTESTATION_TYPES_ENUM_FILE, content, "utf8");
}
