import glob from "glob";
import { toHex } from "../../utils/utils";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { ATT_TYPE_DEFINITIONS_ROOT, CODEGEN_TAB } from "./cg-constants";

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

export function tab(size=CODEGEN_TAB) {
   return ''.padStart(size, " ")
}
export function hexlifyBN(obj: any) {
   let res = {} as any;
   for(let key in obj) {
     let value = obj[key];
     if(value.mul) {  // dirty test if this is BN
       res[key] = toHex(value);
     } else if(Array.isArray(value)) {
       res[key] = (value as any[]).map(item => hexlifyBN(item));
     } else if(typeof value === "object") {
       res[key] = hexlifyBN(value);
     } else {
       res[key] = value;
     }    
   }
   return res;
 }
 