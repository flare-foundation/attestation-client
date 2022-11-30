import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { getSourceName } from "../sources/sources";
import { DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS, VERIFIERS_ROOT, VERIFIERS_ROUTING_FILE } from "./cg-constants";
import { trimStartNewline } from "./cg-utils";
import { genVerifier, verifierFile, verifierFolder, verifierFunctionName } from "./cg-verifiers";

function genDefinitionCases(definition: AttestationTypeScheme) {
  const sourceCases = definition.supportedSources.map((sourceId) => genSourceCase(definition, sourceId)).join("\n");
  const result = `
case AttestationType.${definition.name}:
	switch(sourceId) {
${sourceCases}
		default:
			throw new WrongSourceIdError("Wrong source id");
}`;
  return trimStartNewline(result);
}

function genSourceCase(definition: AttestationTypeScheme, sourceId: number) {
  const result = `
case SourceId.${getSourceName(sourceId)}:
	return ${verifierFunctionName(definition, sourceId)}(client as MCC.${getSourceName(sourceId)}, attestation, indexer, recheck);`;
  return trimStartNewline(result);
}

export function createVerifiersAndRouter(definitions: AttestationTypeScheme[]) {
  let routerImports = "";
  const attestationTypeCases = definitions.map((definition) => genDefinitionCases(definition)).join("\n");

  for (const definition of definitions) {
    for (const sourceId of definition.supportedSources) {
      const relFolder = verifierFolder(sourceId, ".");
      const folder = verifierFolder(sourceId, VERIFIERS_ROOT);
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      const verifierContent = genVerifier(definition, sourceId, folder);
      const prettyContent = prettier.format(verifierContent, PRETTIER_SETTINGS)
      fs.writeFileSync(`${verifierFile(definition, sourceId, folder)}`, prettyContent, "utf8");
      routerImports += `import {${verifierFunctionName(definition, sourceId)}} from "${verifierFile(definition, sourceId, relFolder, false)}"\n`;
    }
  }

  const router = `${DEFAULT_GEN_FILE_HEADER}
import { MccClient, MCC, traceFunction } from "@flarenetwork/mcc"
import { getAttestationTypeAndSource } from "../generated/attestation-request-parse"
import { AttestationType } from "../generated/attestation-types-enum"
import { SourceId } from "../sources/sources";
import { Verification } from "../attestation-types/attestation-types"
      
${routerImports}
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager"
import { Attestation } from "../../attester/Attestation"

export class WrongAttestationTypeError extends Error {
	constructor(message) {
		super(message);
		this.name = 'WrongAttestationTypeError';
	}
}

export class WrongSourceIdError extends Error {
	constructor(message) {
		super(message);
		this.name = 'WrongAttestationTypeError';
	}
}

export async function verifyAttestation(client: MccClient, attestation: Attestation, indexer: IndexedQueryManager, recheck = false): Promise<Verification<any, any>>{
	return traceFunction( _verifyAttestation , client, attestation, indexer, recheck );
}

export async function _verifyAttestation(client: MccClient, attestation: Attestation, indexer: IndexedQueryManager, recheck = false): Promise<Verification<any, any>>{
	let {attestationType, sourceId} = getAttestationTypeAndSource(attestation.data.request);
	switch(attestationType) {
${attestationTypeCases}
		default:
			throw new WrongAttestationTypeError("Wrong attestation type.")
	}   
}`;

  const prettyContent = prettier.format(router, PRETTIER_SETTINGS);
  fs.writeFileSync(`${VERIFIERS_ROUTING_FILE}`, prettyContent, "utf8");
}
