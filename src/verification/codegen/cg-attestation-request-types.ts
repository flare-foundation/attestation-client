import fs from "fs";
import prettier from "prettier";
import { AttestationRequestScheme, AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQUEST_TYPES_FILE, DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS } from "./cg-constants";
import { commentText } from "./cg-utils";

function genDefReqItem(item: AttestationRequestScheme) {
  return `${commentText(item.description)}
   ${item.key}: ${item.type};`;
}

function genAttestationRequestType(definition: AttestationTypeScheme): string {
  definition.dataHashDefinition;
  const values = definition.request.map((item) => genDefReqItem(item)).join("\n\n");
  return `
export interface ${ATTESTATION_TYPE_PREFIX}${definition.name} {
${values}
}
`;
}

function arType(definitions: AttestationTypeScheme[]) {
  const arTypes = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(" | ");
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

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(ATT_REQUEST_TYPES_FILE, prettyContent, "utf8");
}
