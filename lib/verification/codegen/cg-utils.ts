import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { CODEGEN_TAB } from "./cg-constants";

export function trimStartNewline(text: string) {
  return text[0] === "\n" ? text.slice(1) : text;
}

export function indentText(text: string, padding: number, prefix = "") {
  if (prefix !== "") prefix += " "; // add separator
  return text
    .trim()
    .split("\n")
    .map((line) => `${"".padEnd(padding)}${prefix}${line}`)
    .join("\n");
}

export function dashCapitalized(name: string, glue = "-") {
  return name.replace(/([a-z])([A-Z])/g, `$1${glue}$2`).toLowerCase();
}

export function constantize(name: string) {
  return name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}

export function definitionFile(definition: AttestationTypeScheme, folder?: string, addTs = true) {
  let root = folder ? `${folder}/` : "";
  let suffix = addTs ? ".ts" : "";
  return `${root}t-${("" + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}${suffix}`;
}

export function tab(size = CODEGEN_TAB) {
  return "".padStart(size, " ");
}
