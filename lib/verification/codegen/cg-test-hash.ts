import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import { DEFAULT_GEN_FILE_HEADER, HASH_TEST_FILE, PRETTIER_SETTINGS, PRETTIER_SETTINGS_SOL, SOLIDITY_GEN_CONTRACTS_ROOT } from "./cg-constants";

function genTestHashStruct(definition: AttestationTypeScheme) {
  const structName = `${definition.name}`;
  const typedParams = definition.dataHashDefinition.map((item) => `      ${item.type} ${item.key};`).join("\n");
  return `
   struct ${structName} {
${typedParams}
   }
`;
}

function genTestHashFunction(definition: AttestationTypeScheme) {
  const functionName = `hashTest${definition.name}`;
  const params = definition.dataHashDefinition.map((item) => `data.${item.key}`).join(",");
  return `
   function ${functionName}(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      ${definition.name} memory data = abi.decode(_data, (${definition.name}));
      // require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(${params}));
      return hash == _hashToProve && hash == hash2;
    }
`;
}

function getSolidityHashTest(definitions: AttestationTypeScheme[]) {
  const structs = definitions.map((definition) => genTestHashStruct(definition)).join("");
  const functions = definitions.map((definition) => genTestHashFunction(definition)).join("");

  const content = `${DEFAULT_GEN_FILE_HEADER}
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

${functions}

   function verifyMerkleProof(
      bytes32[] calldata proof,
      bytes32 merkleRoot,
      bytes32 leaf
   ) external pure returns (bool) {
      return proof.verify(merkleRoot, leaf);
   }

}
`;
  return content;
}

export function createHashTestSolidityFile(definitions: AttestationTypeScheme[]) {
  // Hash test contract
  const content = `${DEFAULT_GEN_FILE_HEADER}
      ${getSolidityHashTest(definitions)}   
      `;
  if (!fs.existsSync(SOLIDITY_GEN_CONTRACTS_ROOT)) {
    fs.mkdirSync(SOLIDITY_GEN_CONTRACTS_ROOT, { recursive: true });
  }

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS_SOL)
  fs.writeFileSync(`${SOLIDITY_GEN_CONTRACTS_ROOT}/${HASH_TEST_FILE}`, prettyContent, "utf8");
}
