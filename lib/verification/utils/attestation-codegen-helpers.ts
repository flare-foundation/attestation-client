import glob from "glob";
import fs from "fs"
import { AttestationRequestScheme, AttestationTypeScheme } from "../attestation-types/attestation-types";

const GENERATED_ROOT = "lib/verification/generated";
const CONTRACTS_ROOT = "contracts"
export const ATT_TYPE_DEFINITIONS_ROOT = "lib/verification/attestation-types";
export const ATT_GENERATED_CODE_FILE = `${GENERATED_ROOT}/attestation-request-types.ts`
export const ATTESTATION_TYPES_ENUM_FILE = `${GENERATED_ROOT}/attestation-types-enum.ts`
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
   return `   ${item.key}: ${item.type}`
}

function genAttestationRequestType(definition: AttestationTypeScheme) {
   let values = definition.request.map(item => genDefReqItem(item)).join(";\n");
   return `
export interface AR${definition.name} {
${values}
}
`
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

   return `
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
async function createTypesFile() {
   let definitions = await readAttestationTypeSchemes();

   // Enum file
   let content = DEFAULT_GEN_FILE_HEADER;
   content += genAttestationTypeEnum(definitions);
   fs.writeFileSync(ATTESTATION_TYPES_ENUM_FILE, content, "utf8");

   // Request types
   content = `${DEFAULT_GEN_FILE_HEADER}
import { ChainType } from "flare-mcc";
import { BytesLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";
`;

   definitions.forEach(definition => {
      content += genAttestationRequestType(definition);
   })
   fs.writeFileSync(ATT_GENERATED_CODE_FILE, content, "utf8");

   // Hash test contract
   content = `${DEFAULT_GEN_FILE_HEADER}
${getSolidityHashTest(definitions)}   
`
   fs.writeFileSync(HASH_TEST_FILE, content, "utf8");
}

createTypesFile()
   .then(() => process.exit(0))
   .catch(error => {
      console.error(error);
      process.exit(1);
   });
