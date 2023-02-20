import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme, ATT_BYTES, SOURCE_ID_BYTES } from "../attestation-types/attestation-types";
import { ATTESTATION_CLIENT_BASE, DEFAULT_GEN_FILE_HEADER, PRETTIER_SETTINGS_SOL, SOLIDITY_GEN_CONTRACTS_ROOT } from "./cg-constants";
import { constantize } from "./cg-utils";

/**
 * Generate constants used in Solidity code
 * @param definition attestation type defined in t-<number>-<attestation_type_name>.ts file
 * @returns generated constants part of solidity code
 */
function genConstant(definition: AttestationTypeScheme): string {
  return `
uint${ATT_BYTES * 8} public constant ${constantize(definition.name)} = ${definition.id};
`.trim();
}

/**
 * Generates methods to verify each specific attestation type
 * @param definition attestation type defined in t-<number>-<attestation_type_name>.ts file
 * @returns generated attestation type verifiers
 */
function genVerifyFunctions(definition: AttestationTypeScheme): string {
  return `
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
`.trim();
}

/**
 * Generate methods used to encode parameters for attestation types to data object that can be read by attestation clients
 * @param definition attestation type defined in t-<number>-<attestation_type_name>.ts file
 * @returns generated attestation type hash method
 */
function genHashFunctions(definition: AttestationTypeScheme): string {
  const paramsArr = [constantize(definition.name), "_chainId", ...definition.dataHashDefinition.map((item) => `_data.${item.key}`)];
  let encodedParams: string;
  if (paramsArr.length <= 10) {
    const paramsText = paramsArr.join(",\n");
    encodedParams = `abi.encode(\n${paramsText}\n    )`;
  } else {
    // to avoid horrible "stack too deep" solidity errors, split abi.encode and then combine with bytes.concat
    const chunk = 8;
    const parts: string[] = [];
    const comment = `// split into parts of length ${chunk} to avoid 'stack too deep' errors`;
    for (let start = 0; start < paramsArr.length; start += chunk) {
      const partArr = paramsArr.slice(start, Math.min(start + chunk, paramsArr.length));
      const partText = partArr.join(",\n");
      parts.push(`abi.encode(\n${partText}\n)`);
    }
    encodedParams = `bytes.concat(\n${comment}\n${parts.join(",\n")}\n    )`;
  }
  return `
function _hash${definition.name}(uint${SOURCE_ID_BYTES * 8} _chainId, ${definition.name} calldata _data) 
    private pure
    returns (bytes32)
{
    return keccak256(${encodedParams});
}
`.trim();
}

/**
 * Generates the solidity code for file for contracts/generated/contracts/AttestationClientBase.sol
 * @param definitions array of all attestation type definitions to generate methods for (defined in t-<number>-<attestation_type_name>.ts files)
 * @returns string representing solidity code for AttestationClientBase.sol
 */
function getSolidityAttestationClientBase(definitions: AttestationTypeScheme[]): string {
  const constants = definitions.map((definitions) => genConstant(definitions)).join("\n");
  //    let proofFunctions = definitions.map(definition => genProofFunctions(definition)).join("\n\n");
  const verifyFunctions = definitions.map((definition) => genVerifyFunctions(definition)).join("\n\n");
  //    let verifyFunctionsForRound = definitions.map(definition => genVerifyFunctionsForRound(definition)).join("\n\n");
  const hashFunctions = definitions.map((definition) => genHashFunctions(definition)).join("\n\n");

  return `// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "../interface/IAttestationClient.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; 

abstract contract AttestationClientBase is IAttestationClient {
    using MerkleProof for bytes32[];

    // possible attestationType values
${constants}

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
 * Creates contracts/generated/contracts/AttestationClientBase.sol solidity file
 * @param definitions array of all attestation type definitions to generate methods for (defined in t-<number>-<attestation_type_name>.ts files)
 */
export function createSolidityAttestationClientBase(definitions: AttestationTypeScheme[]): void {
  const content = `${DEFAULT_GEN_FILE_HEADER}
${getSolidityAttestationClientBase(definitions)}`;
  if (!fs.existsSync(SOLIDITY_GEN_CONTRACTS_ROOT)) {
    fs.mkdirSync(SOLIDITY_GEN_CONTRACTS_ROOT, { recursive: true });
  }

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS_SOL);
  fs.writeFileSync(`${SOLIDITY_GEN_CONTRACTS_ROOT}/${ATTESTATION_CLIENT_BASE}`, prettyContent, "utf8");
}
