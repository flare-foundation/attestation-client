import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { VerifierTypeConfigGenerationChecker } from "../attestation-types/verifier-configs";
import { SourceId } from "../sources/sources";
import {
  ATTESTATION_TYPE_PREFIX,
  DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  PRETTIER_SETTINGS,
  REQUEST_PARSE_PREFIX_FUNCTION,
  VERIFIERS_ROOT,
  WEB3_HASH_PREFIX_FUNCTION,
} from "./cg-constants";
import { dashCapitalized, definitionFile } from "./cg-utils";
import { verifierFolder } from "./cg-verifiers";

export function createVerifiersImportFileForSource(
  definitions: AttestationTypeScheme[],
  sourceId: SourceId,
  verifierGenChecker?: VerifierTypeConfigGenerationChecker
) {
  let tdefImports = "";
  let tdefExports = "";
  const dhTypeList = [];
  const arTypeList = [];
  const hashFunctionList = [];
  const parserList = [];

  for (const definition of definitions) {
    if (verifierGenChecker && !verifierGenChecker.givenSourceHasAttestationTypeForSource(sourceId, definition.id)) {
      continue;
    }
    // if (definition.supportedSources.indexOf(sourceId) >= 0) {
    //   tdefImports += `import {TDEF as TDEF_${dashCapitalized(definition.name, "_")} } from "../../attestation-types/${definitionFile(
    //     definition,
    //     undefined,
    //     false
    //   )}";\n`;
    //   tdefExports += `export { TDEF_${dashCapitalized(definition.name, "_")} };\n`;
    // }
    dhTypeList.push(`${DATA_HASH_TYPE_PREFIX}${definition.name}`);
    arTypeList.push(`${ATTESTATION_TYPE_PREFIX}${definition.name}`);
    hashFunctionList.push(`${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`);
    parserList.push(`${REQUEST_PARSE_PREFIX_FUNCTION}${definition.name}`);
  }
  const dhTypes = dhTypeList.join(",\n");
  const arTypes = arTypeList.join(",\n");
  const hashFunctions = hashFunctionList.join(",\n");

  const content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";
export { Attestation } from "../../../attester/Attestation";
${tdefImports}
export { RPCInterface, MCC } from "@flarenetwork/mcc";
export { IndexedQueryManager } from "../../../indexed-query-manager/IndexedQueryManager";
export { Verification, VerificationStatus } from "../../attestation-types/attestation-types";
export { randSol } from "../../attestation-types/attestation-types-helpers";
export { 
${dhTypes} 
} from "../../generated/attestation-hash-types";
export { 
${arTypes} 
} from "../../generated/attestation-request-types";
export { AttestationDefinitionStore } from "../../attestation-types/AttestationDefinitionStore";
export { BN };
export { Web3 };
${tdefExports}
`;
  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(`${verifierFolder(sourceId, VERIFIERS_ROOT)}/0imports.ts`, prettyContent, "utf8");
}

export function createVerifiersImportFiles(definitions: AttestationTypeScheme[], verifierGenChecker?: VerifierTypeConfigGenerationChecker) {
  const sourceIds = new Set<SourceId>();
  for (const definition of definitions) {
    for (const cType of definition.supportedSources) {
      sourceIds.add(cType);
    }
  }
  for (const cType of sourceIds) {
    if (verifierGenChecker && !verifierGenChecker.hasSource(cType)) {
      continue;
    }
    createVerifiersImportFileForSource(definitions, cType, verifierGenChecker);
  }
}
