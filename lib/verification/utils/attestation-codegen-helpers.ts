import glob from "glob";
import fs from "fs"
import { AttestationRequestScheme, AttestationTypeScheme, DataHashScheme } from "../attestation-types/attestation-types";
import { dashCapitalized, getSourceName, tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";

const GENERATED_ROOT = "lib/verification/generated";
const CONTRACTS_ROOT = "contracts";
const VERIFIERS_ROOT = "lib/verification/verifiers";
const VERIFIERS_ROUTING_FILE = `${VERIFIERS_ROOT}/verifier_routing.ts`;
const VERIFIER_FUNCTION_PREFIX = "verify";
const ATTESTATION_TYPE_PREFIX = "AR";
const DATA_HASH_TYPE_PREFIX = "DH";
export const ATT_TYPE_DEFINITIONS_ROOT = "lib/verification/attestation-types";
export const ATT_REQUEST_TYPES_FILE = `${GENERATED_ROOT}/attestation-request-types.ts`;
export const ATT_HASH_TYPES_FILE = `${GENERATED_ROOT}/attestation-hash-types.ts`;
export const ATTESTATION_TYPES_ENUM_FILE = `${GENERATED_ROOT}/attestation-types-enum.ts`;
export const HASH_TEST_FILE = `${CONTRACTS_ROOT}/HashTest.sol`

const DEFAULT_GEN_FILE_HEADER = `
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////
`

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

export function fnameToAttTypeId(fname: string) {
   return parseInt(fname.slice(2, 7), 10)
}

function trimStartNewline(text: string) {
   return text[0] === "\n" ? text.slice(1) : text;
}

async function readAttestationTypeSchemes(): Promise<AttestationTypeScheme[]> {
   let names = await getAttTypesDefinitionFiles();
   return names.map(name => require(`../attestation-types/${name}`).TDEF as AttestationTypeScheme)
}

function genAttestationTypeEnum(definitions: AttestationTypeScheme[]): string {
   let values = definitions.map(definition => `   ${definition.name} = ${definition.id}`).join(",\n")
   return `
export enum AttestationType {
${values}
}
`
}

function genDefReqItem(item: AttestationRequestScheme) {
   return `   ${item.key}: ${item.type};`
}

function genDefHashItem(item: DataHashScheme) {
   return `   ${item.key}: ${tsTypeForSolidityType(item.type)};`
}

function genAttestationRequestType(definition: AttestationTypeScheme) {
   definition.dataHashDefinition
   let values = definition.request.map(item => genDefReqItem(item)).join("\n");
   return `
export interface ${ATTESTATION_TYPE_PREFIX}${definition.name} {
${values}
}`
}

function genAttestationDataHashType(definition: AttestationTypeScheme) {
   let values = definition.dataHashDefinition.map(item => genDefHashItem(item)).join("\n");
   return `
export interface ${DATA_HASH_TYPE_PREFIX}${definition.name} {
${values}
}`
}

function genTestHashStruct(definition: AttestationTypeScheme) {
   let structName = `${definition.name}`;
   let typedParams = definition.dataHashDefinition.map(item => `      ${item.type} ${item.key};`).join("\n")
   return `
   struct ${structName} {
${typedParams}
   }
`
}


function genTestHashFunction(definition: AttestationTypeScheme) {
   let functionName = `hashTest${definition.name}`;
   let params = definition.dataHashDefinition.map(item => `data.${item.key}`).join(",")
   return `
   function ${functionName}(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      ${definition.name} memory data = abi.decode(_data, (${definition.name}));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(${params}));
      return hash == _hashToProve && hash == hash2;
    }
`
}

function getSolidityHashTest(definitions: AttestationTypeScheme[]) {
   let structs = definitions.map(definition => genTestHashStruct(definition)).join("");
   let functions = definitions.map(definition => genTestHashFunction(definition)).join("");

   return `${DEFAULT_GEN_FILE_HEADER}
// (c) 2021, Flare Networks Limited. All rights reserved.
// Please see the file LICENSE for licensing terms.

// SPDX-License-Identifier: MIT
//pragma solidity 0.7.6;
pragma solidity 0.8.11;
// Should use open zepplin version 3.4.0
// Newer versions require Solidity ^0.8.0
// import {MerkleProof} from "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// import "hardhat/console.sol";

contract HashTest {
   using MerkleProof for bytes32[];
${structs} 
${functions}

   function verifyMerkleProof(
      bytes32[] calldata proof,
      bytes32 merkleRoot,
      bytes32 leaf
   ) external pure returns (bool) {
      return proof.verify(merkleRoot, leaf);
   }

}
`
}

function verifierFolder(sourceId: number, rootFolder?: string) {
   let root = rootFolder ? `${rootFolder}/` : "";
   return `${root}${getSourceName(sourceId)}`

}
function verifierFile(definition: AttestationTypeScheme, sourceId: number, folder?: string, addTs = true) {
   let root = folder ? `${folder}/` : "";
   let suffix = addTs ? ".ts" : "";
   let name = getSourceName(sourceId).toLowerCase()
   return `${root}v-${('' + definition.id).padStart(5, "0")}-${dashCapitalized(definition.name)}.${name}${suffix}`
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

function genVerifier(definition: AttestationTypeScheme, sourceId: number, folder: string) {
   let functionName = verifierFunctionName(definition, sourceId);
   let responseFields = definition.dataHashDefinition.map(item => randomHashItemValue(item)).join(",\n");
   let types = definition.dataHashDefinition.map(item => `           "${item.type}",\t\t// ${item.key}`).join("\n");
   let values = definition.dataHashDefinition.map(item => `          response.${item.key}`).join(",\n");
   return `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { IndexerQueryHandler, Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/${definitionFile(definition, undefined, false)}";
import { ${ATTESTATION_TYPE_PREFIX}${definition.name} } from "../../generated/attestation-request-types";
import { ${DATA_HASH_TYPE_PREFIX}${definition.name} } from "../../generated/attestation-hash-types";
const web3 = new Web3();

export async function ${functionName}(client: RPCInterface, bytes: string, indexer: IndexerQueryHandler) {
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

function genSourceCase(definition: AttestationTypeScheme, sourceId: number) {
   let result = `
            case ChainType.${getSourceName(sourceId)}:
               return ${verifierFunctionName(definition, sourceId)}(client, request, indexer);`;
   return trimStartNewline(result);
}

function genDefinitionCases(definition: AttestationTypeScheme) {
   let sourceCases = definition.supportedSources.map(sourceId => genSourceCase(definition, sourceId)).join("\n");
   let result = `
      case AttestationType.${definition.name}:
         switch(sourceId) {
${sourceCases}
            default:
               throw new Error("Wrong source id");
         }`;
   return trimStartNewline(result);
}

function verifierFunctionName(definition: AttestationTypeScheme, sourceId: number) {
   return `${VERIFIER_FUNCTION_PREFIX}${definition.name}${getSourceName(sourceId)}`;
}

function createVerifiersAndRouter(definitions: AttestationTypeScheme[]) {
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
import { ChainType, RPCInterface } from "flare-mcc"
import { getAttestationTypeAndSource } from "../attestation-types/attestation-types-helpers"
import { AttestationType } from "../generated/attestation-types-enum"
import { IndexerQueryHandler, Verification } from "../attestation-types/attestation-types"
      
${routerImports}

export async function verifyAttestation(client: RPCInterface, request: string, indexer: IndexerQueryHandler): Promise<Verification<any>>{
   let {attestationType, sourceId} = getAttestationTypeAndSource(request);
   switch(attestationType) {
${attestationTypeCases}
      default:
         throw new Error("Wrong attestation type.")
   }   
}`

   fs.writeFileSync(`${VERIFIERS_ROUTING_FILE}`, router, "utf8");
}

function createAttestationEnumFile(definitions: AttestationTypeScheme[]) {
   // Enum file
   let content = DEFAULT_GEN_FILE_HEADER;
   content += genAttestationTypeEnum(definitions);
   fs.writeFileSync(ATTESTATION_TYPES_ENUM_FILE, content, "utf8");
}

function createAttestationRequestTypesFile(definitions: AttestationTypeScheme[]) {
   // Request types
   let content = `${DEFAULT_GEN_FILE_HEADER}
import { ChainType } from "flare-mcc";
import { BytesLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";
`;

   definitions.forEach(definition => {
      content += genAttestationRequestType(definition);
   })
   fs.writeFileSync(ATT_REQUEST_TYPES_FILE, content, "utf8");

}

function createAttestationHashTypesFile(definitions: AttestationTypeScheme[]) {
   // Request types
   let content = `${DEFAULT_GEN_FILE_HEADER}
import BN from "bn.js";
`;

   definitions.forEach(definition => {
      content += genAttestationDataHashType(definition);
   })
   fs.writeFileSync(ATT_HASH_TYPES_FILE, content, "utf8");
}

function createHashTestSolidityFile(definitions: AttestationTypeScheme[]) {
   // Hash test contract
   let content = `${DEFAULT_GEN_FILE_HEADER}
      ${getSolidityHashTest(definitions)}   
      `
   fs.writeFileSync(HASH_TEST_FILE, content, "utf8");
}

async function createTypesFile() {
   let definitions = await readAttestationTypeSchemes();

   createAttestationEnumFile(definitions);
   createAttestationRequestTypesFile(definitions);
   createAttestationHashTypesFile(definitions);
   createHashTestSolidityFile(definitions);
   createVerifiersAndRouter(definitions);
}

createTypesFile()
   .then(() => process.exit(0))
   .catch(error => {
      console.error(error);
      process.exit(1);
   });

