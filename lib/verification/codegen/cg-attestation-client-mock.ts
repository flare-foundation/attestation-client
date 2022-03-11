import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES } from "../attestation-types/attestation-types";
import { ATTESTATION_CLIENT_MOCK, DEFAULT_GEN_FILE_HEADER, SOLIDITY_CODEGEN_TAB, SOLIDITY_GEN_CONTRACTS_ROOT } from "./cg-constants";
import { constantize, indentText } from "./cg-utils";

function genConstant(definition: AttestationTypeScheme) {
   return (
      `
uint${ATT_BYTES * 8} public constant ${constantize(definition.name)} = ${definition.id};
`.trim()
   )
}

function genProofFunctions(definition: AttestationTypeScheme): any {
   return `
function prove${definition.name}(uint${CHAIN_ID_BYTES*8} _chainId, ${definition.name} calldata _data) 
    external
{
    _proofs[_hash${definition.name}(_chainId, _data)] = true;
}
`.trim()
}

// function genVerifyFunctions(definition: AttestationTypeScheme): any {
//    return `
// function verify${definition.name}(uint${CHAIN_ID_BYTES*8} _chainId, ${definition.name} calldata _data) 
//     external view override
//     returns (bool _proved)
// {
//     return _proofs[_hash${definition.name}(_chainId, _data)];
// }
// `.trim();
// }

function genVerifyFunctions(definition: AttestationTypeScheme): any {
   return `
function verify${definition.name}(uint${CHAIN_ID_BYTES*8} _chainId, ${definition.name} calldata _data) 
    external view override
    returns (bool _proved)
{
    return _verifyMerkleProof(
        _data.merkleProof, 
        _merkleRoots[_data.stateConnectorRound],
        _hash${definition.name}(_chainId, _data)            
    );
}
`.trim();
}


function genHashFunctions(definition: AttestationTypeScheme): any {
   let params = definition.dataHashDefinition.map(item => `_data.${item.key}`).join(",\n")
   return `
function _hash${definition.name}(uint${CHAIN_ID_BYTES*8} _chainId, ${definition.name} calldata _data) 
    private pure
    returns (bytes32)
{
    return keccak256(abi.encode(
        ${constantize(definition.name)},
        _chainId, 
${indentText(params, SOLIDITY_CODEGEN_TAB*2)}
    ));
}
`.trim();
}

function getSolidityAttestationClientMock(definitions: AttestationTypeScheme[]) {
   let constants = definitions.map(definitions => genConstant(definitions)).join("\n")
//    let proofFunctions = definitions.map(definition => genProofFunctions(definition)).join("\n\n");
   let verifyFunctions = definitions.map(definition => genVerifyFunctions(definition)).join("\n\n");
//    let verifyFunctionsForRound = definitions.map(definition => genVerifyFunctionsForRound(definition)).join("\n\n");
   let hashFunctions = definitions.map(definition => genHashFunctions(definition)).join("\n\n");
   
   return (
      `// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "../interface/IAttestationClient.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; 

contract AttestationClientMock is IAttestationClient {
    using MerkleProof for bytes32[];

    // possible attestationType values
${indentText(constants, SOLIDITY_CODEGEN_TAB)}

    mapping (uint256 => bytes32) private _merkleRoots;

    function setMerkleRootForVotingRound(bytes32 _merkleRoot, uint256 roundId) external {
        _merkleRoots[roundId] = _merkleRoot;
    }

${indentText(verifyFunctions, SOLIDITY_CODEGEN_TAB)}

${indentText(hashFunctions, SOLIDITY_CODEGEN_TAB)}

    function _verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 merkleRoot,
        bytes32 leaf
    ) internal pure returns (bool) {
        return proof.verify(merkleRoot, leaf);
    }

}
`
   )
}

export function createSolidityAttestationClientMock(definitions: AttestationTypeScheme[]) {
   let content = `${DEFAULT_GEN_FILE_HEADER}
${getSolidityAttestationClientMock(definitions)}`
   if (!fs.existsSync(SOLIDITY_GEN_CONTRACTS_ROOT)) {
      fs.mkdirSync(SOLIDITY_GEN_CONTRACTS_ROOT, { recursive: true });
   }

   fs.writeFileSync(`${SOLIDITY_GEN_CONTRACTS_ROOT}/${ATTESTATION_CLIENT_MOCK}`, content, "utf8");
}
