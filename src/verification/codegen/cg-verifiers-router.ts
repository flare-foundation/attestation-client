import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { VerifierTypeConfigGenerationChecker } from "../attestation-types/verifier-configs";
import { getSourceName, SourceId } from "../sources/sources";
import { DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS, VERIFIERS_ROOT, VERIFIERS_ROUTING_FILE } from "./cg-constants";
import { trimStartNewline } from "./cg-utils";
import { genVerifier, verifierFile, verifierFolder, verifierFunctionName } from "./cg-verifiers";

function genAttestationCaseForSource(definition: AttestationTypeScheme, sourceId: number) {
  if (definition.supportedSources.find((x) => x === sourceId) !== undefined) {
    const result = `
    case AttestationType.${definition.name}:
      return ${verifierFunctionName(definition, sourceId)}(defStore, client, attestationRequest, indexer);`;
    return trimStartNewline(result);
  }
  return "";
}

function genVerifiersForSourceId(definitions: AttestationTypeScheme[], sourceId: number, verifierGenChecker?: VerifierTypeConfigGenerationChecker) {
  if (verifierGenChecker && !verifierGenChecker.hasSource(sourceId)) {
    return "";
  }
  const sourceCases = definitions
    .filter((definition) => !verifierGenChecker || verifierGenChecker.givenSourceHasAttestationTypeForSource(sourceId, definition.id))
    .map((definition) => genAttestationCaseForSource(definition, sourceId))
    .join("\n");
  const sourceName = getSourceName(sourceId);
  const result = `
export async function verify${sourceName}(
  defStore: AttestationDefinitionStore,
  client:  MCC.${sourceName}, 
  attestationRequest: string,
  indexer: IndexedQueryManager
): Promise<Verification<ARType, DHType>>{
  let {attestationType, sourceId} = getAttestationTypeAndSource(attestationRequest);

  if(sourceId != SourceId.${sourceName}) {
    throw new WrongSourceIdError("Wrong source while calling 'verify${sourceName}'(...)");
  }
  
  switch(attestationType) {
    ${sourceCases}
        default:
          throw new WrongAttestationTypeError("Unknown attestation type");
  }
}
`;
  return trimStartNewline(result);
}

function genVerifiersForSources(definitions: AttestationTypeScheme[], verifierGenChecker?: VerifierTypeConfigGenerationChecker) {
  let sources = new Set<SourceId>();
  definitions.forEach((definition) => {
    definition.supportedSources.forEach((source) => sources.add(source));
  });
  let sourceList = [...sources];
  sourceList.sort();
  return sourceList.map((sourceId) => genVerifiersForSourceId(definitions, sourceId, verifierGenChecker)).join("\n");
}

function genDefinitionCases(definition: AttestationTypeScheme, verifierGenChecker?: VerifierTypeConfigGenerationChecker) {
  if (verifierGenChecker && !verifierGenChecker.hasAttestationType(definition.id)) {
    return "";
  }
  const sourceCases = definition.supportedSources.map((sourceId) => genSourceCase(definition, sourceId, verifierGenChecker)).join("\n");
  const result = `
case AttestationType.${definition.name}:
	switch(sourceId) {
${sourceCases}
		default:
			throw new WrongSourceIdError("Wrong source id");
}`;
  return trimStartNewline(result);
}

function genSourceCase(definition: AttestationTypeScheme, sourceId: number, verifierGenChecker?: VerifierTypeConfigGenerationChecker) {
  if (verifierGenChecker && !verifierGenChecker.givenSourceHasAttestationTypeForSource(sourceId, definition.id)) {
    return "";
  }
  const result = `
case SourceId.${getSourceName(sourceId)}:
	return ${verifierFunctionName(definition, sourceId)}(defStore, client as MCC.${getSourceName(sourceId)}, attestationRequest, indexer);`;
  return trimStartNewline(result);
}

export function createVerifiersAndRouter(definitions: AttestationTypeScheme[], verifierGenChecker?: VerifierTypeConfigGenerationChecker) {
  let routerImports = "";
  const attestationTypeCases = definitions.map((definition) => genDefinitionCases(definition, verifierGenChecker)).join("\n");
  const verifiersForSources = genVerifiersForSources(definitions, verifierGenChecker);

  for (const definition of definitions) {
    for (const sourceId of definition.supportedSources) {
      if (verifierGenChecker && !verifierGenChecker.givenSourceHasAttestationTypeForSource(sourceId, definition.id)) {
        continue;
      }
      const relFolder = verifierFolder(sourceId, ".");
      const folder = verifierFolder(sourceId, VERIFIERS_ROOT);
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      const verifierContent = genVerifier(definition, sourceId, folder);
      const prettyContent = prettier.format(verifierContent, PRETTIER_SETTINGS);
      fs.writeFileSync(`${verifierFile(definition, sourceId, folder)}`, prettyContent, "utf8");
      routerImports += `import {${verifierFunctionName(definition, sourceId)}} from "${verifierFile(definition, sourceId, relFolder, false)}"\n`;
    }
  }

  const router = `${DEFAULT_GEN_FILE_HEADER}
import { MccClient, MCC, traceFunction } from "@flarenetwork/mcc"
import { AttestationType } from "../generated/attestation-types-enum"
import { SourceId } from "../sources/sources";
import { Verification } from "../attestation-types/attestation-types";
      
${routerImports}
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager"
import { Attestation } from "../../attester/Attestation"
import { DHType } from "../generated/attestation-hash-types";
import { ARType } from "../generated/attestation-request-types";
import { AttestationDefinitionStore, getAttestationTypeAndSource } from "../attestation-types/AttestationDefinitionManager";

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

export async function verifyAttestation(defStore: AttestationDefinitionStore, client: MccClient, attestation: Attestation, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>>{
  return traceFunction(
    _verifyAttestation,
    defStore,
    client,
    attestation.data.request,
    indexer
  );
}

export async function _verifyAttestation(
  defStore: AttestationDefinitionStore,
  client: MccClient,
  attestationRequest: string,
  indexer: IndexedQueryManager
): Promise<Verification<ARType, DHType>>{
	let {attestationType, sourceId} = getAttestationTypeAndSource(attestationRequest);
	switch(attestationType) {
${attestationTypeCases}
		default:
			throw new WrongAttestationTypeError("Wrong attestation type.")
	}  
}

${verifiersForSources}
`;

  const prettyContent = prettier.format(router, PRETTIER_SETTINGS);
  fs.writeFileSync(`${VERIFIERS_ROUTING_FILE}`, prettyContent, "utf8");
}
