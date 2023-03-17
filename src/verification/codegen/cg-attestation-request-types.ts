import fs from "fs";
import prettier from "prettier";
import { option } from "yargs";
import { AttestationRequestScheme, AttestationTypeScheme, SupportedRequestType } from "../attestation-types/attestation-types";
import { ATTESTATION_TYPE_PREFIX, ATT_REQUEST_TYPES_FILE, DEFAULT_GEN_FILE_HEADER, GENERATED_ROOT, PRETTIER_SETTINGS } from "./cg-constants";
import { JSDocCommentText, OpenAPIOptionsRequests } from "./cg-utils";

function enumProperty(enumName: string, comment?: string) {
  return `{enum: ${enumName}, description: \`${comment ?? ""}\`}`;
}

function numberLikeProperty(comment?: string) {
  return `{
    oneOf: [
      { type: "string"},
      { type: "number"}
    ],
    description: \`${comment ?? ""}\`
  }`;
}

function genDefReqItem(item: AttestationRequestScheme, options: OpenAPIOptionsRequests) {
  function itemTypeApiProp(itemType: SupportedRequestType) {
    switch (itemType) {
      case "AttestationType":
      case "SourceId":
        return enumProperty(itemType, item.description);
      case "NumberLike":
        return numberLikeProperty(item.description);
      case "ByteSequenceLike":
        return "";
      default:
        // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
        ((_: never): void => {})(itemType);
    }
  }

  let annotation = options?.dto ? `\n@ApiProperty(${itemTypeApiProp(item.type)})\n` : "";
  return `${JSDocCommentText(item.description)}${annotation}
   ${item.key}: ${item.type};`;
}

function genAttestationRequestType(definition: AttestationTypeScheme, options: OpenAPIOptionsRequests): string {
  definition.dataHashDefinition;
  const values = definition.request.map((item) => genDefReqItem(item, options)).join("\n\n");
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

export function createAttestationRequestTypesFile(definitions: AttestationTypeScheme[], options: OpenAPIOptionsRequests) {
  const openApiImport = options?.dto ? '\nimport { ApiProperty } from "@nestjs/swagger";' : "";
  let prefixPath = "";
  if (options?.dto && options?.filePath) {
    prefixPath =
      options.filePath
        .split("/")
        .slice(1)
        .map((x) => "..")
        .join("/") +
      "/" +
      GENERATED_ROOT +
      "/";
  }
  // Request types
  let content = `${DEFAULT_GEN_FILE_HEADER}
${openApiImport}  
import { ByteSequenceLike, NumberLike } from "${prefixPath}../attestation-types/attestation-types";
import { AttestationType } from "${prefixPath}./attestation-types-enum";
import { SourceId } from "${prefixPath}../sources/sources";
`;

  definitions.forEach((definition) => {
    content += genAttestationRequestType(definition, options);
  });
  content += arType(definitions);

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  const fName = options?.filePath ?? ATT_REQUEST_TYPES_FILE;
  fs.writeFileSync(fName, prettyContent, "utf8");
}
