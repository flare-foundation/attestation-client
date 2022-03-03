import fs from "fs";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { DEFAULT_GEN_FILE_HEADER, HASH_TEST_FILE } from "./cg-constants";

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

export function createHashTestSolidityFile(definitions: AttestationTypeScheme[]) {
   // Hash test contract
   let content = `${DEFAULT_GEN_FILE_HEADER}
      ${getSolidityHashTest(definitions)}   
      `
   fs.writeFileSync(HASH_TEST_FILE, content, "utf8");
}
