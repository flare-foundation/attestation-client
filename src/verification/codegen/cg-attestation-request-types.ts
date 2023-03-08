import fs from "fs";
import prettier from "prettier";
import { AttestationRequestScheme, AttestationTypeScheme, SupportedRequestType } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQUEST_TYPES_FILE, DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS } from "./cg-constants";
import { commentText } from "./cg-utils";

function enumProperty(enumName: string) {
  return `{enum: ${enumName}}`;
}

function numberLikeProperty() {
  return `{
    oneOf: [
      { type: "string"},
      { type: "number"}
    ]
  }`;
}

function genDefReqItem(item: AttestationRequestScheme) {

  function itemTypeApiProp(itemType: SupportedRequestType) {
    switch(itemType){
      case "AttestationType":
      case "SourceId":
        return enumProperty(itemType)
      case "NumberLike":
        return numberLikeProperty()
      case "ByteSequenceLike":
        return ""
      default:
        // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
        ((_: never): void => {})(itemType);
    }
  }
  
  return `${commentText(item.description)}
   @ApiProperty(${itemTypeApiProp(item.type)})
   ${item.key}: ${item.type};`;
}

function genAttestationRequestType(definition: AttestationTypeScheme): string {
  definition.dataHashDefinition;
  const values = definition.request.map((item) => genDefReqItem(item)).join("\n\n");
  return `
export class ${ATTESTATION_TYPE_PREFIX}${definition.name} {
${values}
}
`;
}

function arType(definitions: AttestationTypeScheme[]) {
  const arNames = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`);
  const arTypes = arNames.join(" | ");
  const arUnionArray = arNames.join(",");
  return `export type ${ATTESTATION_TYPE_PREFIX}Type = ${arTypes};
  export const ${ATTESTATION_TYPE_PREFIX}TypeArray = [${arUnionArray}];`;
}

export function createAttestationRequestTypesFile(definitions: AttestationTypeScheme[]) {
  // Request types
  let content = `${DEFAULT_GEN_FILE_HEADER}
import { ApiProperty } from "@nestjs/swagger";
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
