import { AttestationRequestScheme, AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQUEST_TYPES_FILE, CODEGEN_TAB, DEFAULT_GEN_FILE_HEADER } from "./cg-constants";
import { indentText } from "./cg-utils";
import fs from "fs";

function genDefReqItem(item: AttestationRequestScheme) {
  return `${indentText(item.description, CODEGEN_TAB, "//")}
   ${item.key}: ${item.type};`;
}

function genAttestationRequestType(definition: AttestationTypeScheme) {
  definition.dataHashDefinition;
  let values = definition.request.map((item) => genDefReqItem(item)).join("\n\n");
  return `
export interface ${ATTESTATION_TYPE_PREFIX}${definition.name} {
${values}
}
`;
}

function arType(definitions: AttestationTypeScheme[]) {
  let arTypes = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(" | ");
  return `export type ${ATTESTATION_TYPE_PREFIX}Type = ${arTypes};`;
}

export function createAttestationRequestTypesFile(definitions: AttestationTypeScheme[]) {
  // Request types
  let content = `${DEFAULT_GEN_FILE_HEADER}
import { ByteSequenceLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";
import { SourceId } from "../sources/sources";
`;

  definitions.forEach((definition) => {
    content += genAttestationRequestType(definition);
  });
  content += arType(definitions);
  fs.writeFileSync(ATT_REQUEST_TYPES_FILE, content, "utf8");
}
