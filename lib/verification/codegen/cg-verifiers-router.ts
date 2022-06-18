import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { getSourceName } from "../sources/sources";
import { CODEGEN_TAB, DEFAULT_GEN_FILE_HEADER, VERIFIERS_ROOT, VERIFIERS_ROUTING_FILE } from "./cg-constants";
import { indentText, tab, trimStartNewline } from "./cg-utils";
import { genVerifier, verifierFile, verifierFolder, verifierFunctionName } from "./cg-verifiers";

function genDefinitionCases(definition: AttestationTypeScheme) {
   let sourceCases = definition.supportedSources.map(sourceId => genSourceCase(definition, sourceId)).join("\n");
   let result = `
case AttestationType.${definition.name}:
${tab()}switch(sourceId) {
${indentText(sourceCases, CODEGEN_TAB*2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new WrongSourceIdError("Wrong source id");
}`;
   return trimStartNewline(result);
}

function genSourceCase(definition: AttestationTypeScheme, sourceId: number) {
   let result = `
case SourceId.${getSourceName(sourceId)}:
${tab()}return ${verifierFunctionName(definition, sourceId)}(client as MCC.${getSourceName(sourceId)}, attestation, indexer, recheck);`;
   return trimStartNewline(result);
}

export function createVerifiersAndRouter(definitions: AttestationTypeScheme[]) {
   let routerImports = ""
   let attestationTypeCases = definitions.map(definition => genDefinitionCases(definition)).join("\n")

   for (let definition of definitions) {
      for (let sourceId of definition.supportedSources) {
         let relFolder = verifierFolder(sourceId, ".");
         let folder = verifierFolder(sourceId, VERIFIERS_ROOT);
         if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
         }
         let verifierContent = genVerifier(definition, sourceId, folder);
         fs.writeFileSync(`${verifierFile(definition, sourceId, folder)}`, verifierContent, "utf8");
         routerImports += `import {${verifierFunctionName(definition, sourceId)}} from "${verifierFile(definition, sourceId, relFolder, false)}"\n`
      }
   }

   let router = `${DEFAULT_GEN_FILE_HEADER}
import { MccClient, MCC, Managed } from "@flarenetwork/mcc"
import { getAttestationTypeAndSource } from "../generated/attestation-request-parse"
import { AttestationType } from "../generated/attestation-types-enum"
import { SourceId } from "../sources/sources";
import { Verification } from "../attestation-types/attestation-types"
      
${routerImports}
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager"
import { Attestation } from "../../attester/Attestation"

export class WrongAttestationTypeError extends Error {
${tab()}constructor(message) {
${tab()}${tab()}super(message);
${tab()}${tab()}this.name = 'WrongAttestationTypeError';
${tab()}}
}

export class WrongSourceIdError extends Error {
${tab()}constructor(message) {
${tab()}${tab()}super(message);
${tab()}${tab()}this.name = 'WrongAttestationTypeError';
${tab()}}
}

export async function verifyAttestation(client: MccClient, attestation: Attestation, indexer: IndexedQueryManager, recheck = false): Promise<Verification<any, any>>{
${tab()}let {attestationType, sourceId} = getAttestationTypeAndSource(attestation.data.request);
${tab()}switch(attestationType) {
${indentText(attestationTypeCases, CODEGEN_TAB*2)}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new WrongAttestationTypeError("Wrong attestation type.")
${tab()}}   
}`

   fs.writeFileSync(`${VERIFIERS_ROUTING_FILE}`, router, "utf8");
}
