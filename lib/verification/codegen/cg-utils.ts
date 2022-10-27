import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { CODEGEN_TAB } from "./cg-constants";

export function trimStartNewline(text: string) {
  return text[0] === "\n" ? text.slice(1) : text;
}

export function commentText(text: string, prefix = "//") {
  if (prefix !== "") prefix += " "; // add separator
  return text
    .trim()
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

export function dashCapitalized(name: string, glue = "-") {
  return name.replace(/([a-z])([A-Z])/g, `$1${glue}$2`).toLowerCase();
}

/**
 * transform constant name to capitalized string reallyCoolConstant -> REALLY_COOL_CONSTANT
 * @param name parameter to be formatted as constant
 * @returns Formatted constant name 
 */
export function constantize(name: string) {
  return name.replace(/([a-zA-Z])([A-Z])/g, "$1_$2").toUpperCase();
}

export function definitionFile(definition: AttestationTypeScheme, folder?: string, addTs = true) {
  const root = folder ? `${folder}/` : "";
  const suffix = addTs ? ".ts" : "";
  return `${root}t-${("" + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}${suffix}`;
}

