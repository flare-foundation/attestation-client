import glob from "glob";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATT_TYPE_DEFINITIONS_ROOT } from "./cg-constants";

export function trimStartNewline(text: string) {
   return text[0] === "\n" ? text.slice(1) : text;
}

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

export async function readAttestationTypeSchemes(): Promise<AttestationTypeScheme[]> {
   let names = await getAttTypesDefinitionFiles();
   return names.map(name => require(`../attestation-types/${name}`).TDEF as AttestationTypeScheme)
}

export function indentText(text: string, padding: number, prefix = "") {
   if (prefix !== "") prefix += " ";   // add separator
   return text.trim().split("\n").map(line => `${"".padEnd(padding)}${prefix}${line}`).join("\n")
}

export function dashCapitalized(name: string, glue='-') {
   return name.replace(/([a-z])([A-Z])/g, `$1${glue}$2`).toLowerCase()
}
 
export function constantize(name: string) {
   return name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
}

export function definitionFile(definition: AttestationTypeScheme, folder?: string, addTs = true) {
   let root = folder ? `${folder}/` : "";
   let suffix = addTs ? ".ts" : "";
   return `${root}t-${('' + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}${suffix}`
}
