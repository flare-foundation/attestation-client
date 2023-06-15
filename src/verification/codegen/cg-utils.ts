import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { VerifierTypeConfigGenerationChecker } from "../attestation-types/verifier-configs";
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

export function JSDocCommentText(text: string) {
  return (
    "/**\n" +
    text
      .trim()
      .split("\n")
      .map((line) => `* ${line}`)
      .join("\n") +
    "\n*/"
  );
}

export function indentText(text: string | string[], indent: number, indentFirstLine: boolean = true) {
  const indentStr = ''.padStart(indent, ' ');
  let lines = typeof text === 'string' ? text.trimEnd().split('\n') : text;
  lines = lines.map(line => line.trimEnd());
  if (lines.length > 0 && lines[0] === '') lines = lines.slice(1);
  lines = lines.map((line, ind) => ind > 0 || indentFirstLine ? indentStr + line : line);
  return lines.join('\n');
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

export interface OpenAPIOptionsRequests {
  dto?: boolean;
  filePath?: string;
  verifierGenChecker?: VerifierTypeConfigGenerationChecker;
  verifierValidation?: boolean;
}

export interface OpenAPIOptionsResponses {
  dto?: boolean;
  filePath?: string;
  verifierGenChecker?: VerifierTypeConfigGenerationChecker;
}
