import { AttestationRequestScheme, AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQUEST_TYPES_FILE, DEFAULT_GEN_FILE_HEADER } from "./cg-constants";
import fs from "fs";

function genDefReqItem(item: AttestationRequestScheme) {
   return `   ${item.key}: ${item.type};`
}

function genAttestationRequestType(definition: AttestationTypeScheme) {
   definition.dataHashDefinition
   let values = definition.request.map(item => genDefReqItem(item)).join("\n");
   return `
export interface ${ATTESTATION_TYPE_PREFIX}${definition.name} {
${values}
}`
}

export function createAttestationRequestTypesFile(definitions: AttestationTypeScheme[]) {
   // Request types
   let content = `${DEFAULT_GEN_FILE_HEADER}
import { ChainType } from "flare-mcc";
import { BytesLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";
`;

   definitions.forEach(definition => {
      content += genAttestationRequestType(definition);
   })
   fs.writeFileSync(ATT_REQUEST_TYPES_FILE, content, "utf8");
}
