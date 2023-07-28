import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, SOURCE_ID_BYTES, RESPONSE_BASE_DEFINITIONS } from "../attestation-types/attestation-types";
import { ATTESTATION_CLIENT_BASE, DEFAULT_GEN_FILE_HEADER, SOLIDITY_GEN_CONTRACTS_ROOT } from "./cg-constants";
import { constantize, indentText } from "./cg-utils";

/**
 * Generate constants used in Solidity code
 * @param definition attestation type defined in t-<number>-<attestation_type_name>.ts file
 * @returns generated constants part of solidity code
 */
function genConstant(definition: AttestationTypeScheme): string {
  return `uint${ATT_BYTES * 8} public constant ${constantize(definition.name)} = ${definition.id};`;
}

/**
 * Generates methods to verify each specific attestation type
 * @param definition attestation type defined in t-<number>-<attestation_type_name>.ts file
 * @returns generated attestation type verifiers
 */
function genVerifyFunctions(definition: AttestationTypeScheme): string {
  return `\
    function verify${definition.name}(uint${SOURCE_ID_BYTES * 8} _chainId, ${definition.name} calldata _data)
        external view override
        returns (bool _proved)
    {
        return _verifyMerkleProof(
            _data.merkleProof,
            merkleRootForRound(_data.stateConnectorRound),
            _hash${definition.name}(_chainId, _data)
        );
    }
  `.trimEnd();
}

/**
 * Generate methods used to encode parameters for attestation types to data object that can be read by attestation clients
 * @param definition attestation type defined in t-<number>-<attestation_type_name>.ts file
 * @returns generated attestation type hash method
 */
function genHashFunctions(definition: AttestationTypeScheme): string {
  const paramsArr = [
    constantize(definition.name),
    "_chainId",
    ...[...RESPONSE_BASE_DEFINITIONS, ...definition.dataHashDefinition].map((item) => `_data.${item.key}`),
  ];
  let encodedParams: string;
  if (paramsArr.length <= 10) {
    const paramsText = indentText(paramsArr.join(",\n"), 12);
    encodedParams = `abi.encode(\n${paramsText}\n        )`;
  } else {
    // to avoid horrible "stack too deep" solidity errors, split abi.encode and then combine with bytes.concat
    const chunk = 8;
    const parts: string[] = [];
    const comment = indentText(`// split into parts of length ${chunk} to avoid 'stack too deep' errors`, 12);
    for (let start = 0; start < paramsArr.length; start += chunk) {
      const partArr = paramsArr.slice(start, Math.min(start + chunk, paramsArr.length));
      const partText = indentText(partArr.join(",\n"), 4);
      parts.push(`abi.encode(\n${partText}\n)`);
    }
    const paramsText = indentText(parts.join(",\n"), 12);
    encodedParams = `bytes.concat(\n${comment}\n${paramsText}\n        )`;
  }
  return `\
    function _hash${definition.name}(uint${SOURCE_ID_BYTES * 8} _chainId, ${definition.name} calldata _data)
        private pure
        returns (bytes32)
    {
        return keccak256(${encodedParams});
    }
  `.trimEnd();
}

/**
 * Generates the solidity code for file for contracts/generated/contracts/SCProofVerifierBase.sol
 * @param definitions array of all attestation type definitions to generate methods for (defined in t-<number>-<attestation_type_name>.ts files)
 * @returns string representing solidity code for SCProofVerifierBase.sol
 */
function getSolidityAttestationClientBase(definitions: AttestationTypeScheme[]): string {
  const constants = definitions.map((definitions) => genConstant(definitions)).join("\n");
  //    let proofFunctions = definitions.map(definition => genProofFunctions(definition)).join("\n\n");
  const verifyFunctions = definitions.map((definition) => genVerifyFunctions(definition)).join("\n\n");
  //    let verifyFunctionsForRound = definitions.map(definition => genVerifyFunctionsForRound(definition)).join("\n\n");
  const hashFunctions = definitions.map((definition) => genHashFunctions(definition)).join("\n\n");

  return `\
// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "../interface/ISCProofVerifier.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

abstract contract SCProofVerifierBase is ISCProofVerifier {
    using MerkleProof for bytes32[];

    // possible attestationType values
${indentText(constants, 4)}

${verifyFunctions}

    function merkleRootForRound(uint256 _stateConnectorRound) public view virtual returns (bytes32 _merkleRoot);

${hashFunctions}

    function _verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 merkleRoot,
        bytes32 leaf
    ) internal pure returns (bool) {
        return proof.verify(merkleRoot, leaf);
    }

}
`;
}

/**
 * Creates contracts/generated/contracts/SCProofVerifierBase.sol solidity file
 * @param definitions array of all attestation type definitions to generate methods for (defined in t-<number>-<attestation_type_name>.ts files)
 */
export function createSolidityAttestationClientBase(definitions: AttestationTypeScheme[]): void {
  const content = `${DEFAULT_GEN_FILE_HEADER}
${getSolidityAttestationClientBase(definitions)}`;
  if (!fs.existsSync(SOLIDITY_GEN_CONTRACTS_ROOT)) {
    fs.mkdirSync(SOLIDITY_GEN_CONTRACTS_ROOT, { recursive: true });
  }
  fs.writeFileSync(`${SOLIDITY_GEN_CONTRACTS_ROOT}/${ATTESTATION_CLIENT_BASE}`, content, "utf8");
}
