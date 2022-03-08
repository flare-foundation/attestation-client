import { AttestationTypeScheme, DataHashScheme } from "../attestation-types/attestation-types";
import { getSourceName, tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATTESTATION_TYPE_PREFIX, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, VERIFIER_FUNCTION_PREFIX } from "./cg-constants";
import { dashCapitalized, trimStartNewline } from "./cg-utils";

export function verifierFolder(sourceId: number, rootFolder?: string) {
   let root = rootFolder ? `${rootFolder}/` : "";
   return `${root}${getSourceName(sourceId)}`

}
export function verifierFile(definition: AttestationTypeScheme, sourceId: number, folder?: string, addTs = true) {
   let root = folder ? `${folder}/` : "";
   let suffix = addTs ? ".ts" : "";
   let name = getSourceName(sourceId).toLowerCase()
   return `${root}v-${('' + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}.${name}${suffix}`
}

export function verifierFunctionName(definition: AttestationTypeScheme, sourceId: number) {
   return `${VERIFIER_FUNCTION_PREFIX}${definition.name}${getSourceName(sourceId)}`;
}

function definitionFile(definition: AttestationTypeScheme, folder?: string, addTs = true) {
   let root = folder ? `${folder}/` : "";
   let suffix = addTs ? ".ts" : "";
   return `${root}t-${('' + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}${suffix}`
}

function randomHashItemValue(item: DataHashScheme) {
   let res =  `
         ${item.key}: randSol(request, "${item.key}", "${item.type}") as ${tsTypeForSolidityType(item.type)}`
   return trimStartNewline(res);
}

export function genVerifier(definition: AttestationTypeScheme, sourceId: number, folder: string) {
   let functionName = verifierFunctionName(definition, sourceId);
   let responseFields = definition.dataHashDefinition.map(item => randomHashItemValue(item)).join(",\n");
   let types = definition.dataHashDefinition.map(item => `           "${item.type}",\t\t// ${item.key}`).join("\n");
   let values = definition.dataHashDefinition.map(item => `          response.${item.key}`).join(",\n");
   return `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/${definitionFile(definition, undefined, false)}";
import { ${ATTESTATION_TYPE_PREFIX}${definition.name} } from "../../generated/attestation-request-types";
import { ${DATA_HASH_TYPE_PREFIX}${definition.name} } from "../../generated/attestation-hash-types";
import { IndexedQueryManager } from "../../../indexed-query-manager/IndexedQueryManager";

const web3 = new Web3();

export async function ${functionName}(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF) as ${ATTESTATION_TYPE_PREFIX}${definition.name};

   // Do the magic here and fill the response with the relevant data

   let response = {
${responseFields}      
   } as ${DATA_HASH_TYPE_PREFIX}${definition.name};
   let encoded = web3.eth.abi.encodeParameters(
      [
${types}
      ],
      [
${values}
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<${DATA_HASH_TYPE_PREFIX}${definition.name}>;
}   
`
}
