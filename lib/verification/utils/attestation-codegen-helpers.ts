import glob from "glob";
import fs from "fs"
import { AttestationRequestScheme, AttestationTypeScheme } from "../attestation-types/attestation-types";

const GENERATED_ROOT = "lib/verification/generated";
export const ATT_TYPE_DEFINITIONS_ROOT = "lib/verification/attestation-types";
export const ATT_GENERATED_CODE_FILE = `${GENERATED_ROOT}/attestation-types-helpers.ts`
export const ATTESTATION_TYPES_ENUM_FILE = `${GENERATED_ROOT}/attestation-types-enum.ts`

export async function getAttTypesDefinitionFiles(): Promise<string[]> {
   return new Promise((resolve, reject) => {
      glob(`t-*.ts`, { cwd: ATT_TYPE_DEFINITIONS_ROOT }, (er: any, files: string[] | null) => {
         if (er) {
            reject(er);
         } else {
            if (files) {
               files.sort();
            }
            resolve(files || []);
         }
      });
   });
}

export function fnameToAttTypeId(fname: string) {
   return parseInt(fname.slice(2, 7), 10)
}

async function readAttestationTypeSchemes(): Promise<AttestationTypeScheme[]> {
   let names = await getAttTypesDefinitionFiles();
   return names.map(name => require(`../attestation-types/${name}`).TDEF as AttestationTypeScheme)
}

function genAttestationTypeEnum(definitions: AttestationTypeScheme[]): string {
   let values = definitions.map(definition => `   ${definition.name} = ${definition.id}`).join(",\n")
   return `
export enum AttestationType {
${values}
}
`    
}

function genDefReqItem(item: AttestationRequestScheme) {
   return `   ${item.key}: ${item.type}`   
}

function genAttestationRequestType(definition: AttestationTypeScheme) {
   let values = definition.request.map(item => genDefReqItem(item)).join(";\n");
   return `
export interface AR${definition.name} {
${values}
}
`    
}

export async function createTypesFile() {
   let definitions = await readAttestationTypeSchemes();
   let content = `
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////
`;
   content += genAttestationTypeEnum(definitions);
   fs.writeFileSync(ATTESTATION_TYPES_ENUM_FILE, content, "utf8");

   content = `
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////
import { ChainType } from "flare-mcc";
import { BytesLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";
`;

   definitions.forEach(definition => {
      content += genAttestationRequestType(definition);
   })
   fs.writeFileSync(ATT_GENERATED_CODE_FILE, content, "utf8");
} 