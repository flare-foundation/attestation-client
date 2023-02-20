import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import {
  DEFAULT_GEN_FILE_HEADER,
  I_ATTESTATION_CLIENT_FILE, PRETTIER_SETTINGS_SOL, SOLIDITY_GEN_INTERFACES_ROOT,
  SOLIDITY_VERIFICATION_FUNCTION_PREFIX
} from "./cg-constants";
import { commentText } from "./cg-utils";

function genProofStructs(definition: AttestationTypeScheme): any {
  const structName = `${definition.name}`;
  const typedParams = definition.dataHashDefinition
    .map(
      (item) =>
        `
${commentText(item.description)}
        ${item.type} ${item.key};`
    )
    .join("\n");
  return `
    struct ${structName} {
        // Round number (epoch id) of the state connector request
        uint256 stateConnectorRound;

        // Merkle proof needed to verify the existence of transaction with the below fields.
        bytes32[] merkleProof;
${typedParams}
    }
`;
}

function genProofVerificationFunctionSignatures(definition: AttestationTypeScheme): any {
  const functionName = `${SOLIDITY_VERIFICATION_FUNCTION_PREFIX}${definition.name}`;
  return `function ${functionName}(uint32 _chainId, ${definition.name} calldata _data)
    external view
    returns (bool _proved);
`;
}

function getSolidityIAttestationClient(definitions: AttestationTypeScheme[]) {
  const structs = definitions.map((definition) => genProofStructs(definition)).join("");
  const verifyProofFunctionSignatures = definitions
    .map((definition) => genProofVerificationFunctionSignatures(definition))
    .join("\n\n");
  const proofVerificationComment = `
When verifying state connector proofs, the data verified will be
\`keccak256(abi.encode(attestationType, _chainId, all _data fields except merkleProof, stateConnectorRound))\`
where \`attestationType\` (\`uint16\`) is a different constant for each of the methods below
(possible values are defined in attestation specs).
`;

  return `// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;


interface IAttestationClient {
${structs}
${commentText(proofVerificationComment)}

${verifyProofFunctionSignatures}
}
`;
}

export function createSolidityIAttestationClient(definitions: AttestationTypeScheme[]) {
  const content = `${DEFAULT_GEN_FILE_HEADER}
${getSolidityIAttestationClient(definitions)}`;
  if (!fs.existsSync(SOLIDITY_GEN_INTERFACES_ROOT)) {
    fs.mkdirSync(SOLIDITY_GEN_INTERFACES_ROOT, { recursive: true });
  }

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS_SOL)
  fs.writeFileSync(`${SOLIDITY_GEN_INTERFACES_ROOT}/${I_ATTESTATION_CLIENT_FILE}`, prettyContent, "utf8");
}
