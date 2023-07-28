import fs from "fs";
import { AttestationTypeScheme, RESPONSE_BASE_DEFINITIONS } from "../attestation-types/attestation-types";
import {
  DEFAULT_GEN_FILE_HEADER,
  I_ATTESTATION_CLIENT_FILE,
  SOLIDITY_GEN_INTERFACES_ROOT,
  SOLIDITY_VERIFICATION_FUNCTION_PREFIX,
} from "./cg-constants";
import { commentText, indentText } from "./cg-utils";

function genProofStructs(definition: AttestationTypeScheme): any {
  const structName = `${definition.name}`;
  const typedParams = [...RESPONSE_BASE_DEFINITIONS, ...definition.dataHashDefinition]
    .map(
      (item) =>
        `
        ${indentText(commentText(item.description), 8, false)}
        ${item.type} ${item.key};`
    )
    .join("\n");
  return `
    struct ${structName} {
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
  const verifyProofFunctionSignatures = definitions.map((definition) => genProofVerificationFunctionSignatures(definition)).join("\n\n");
  const proofVerificationComment = `
When verifying state connector proofs, the data verified will be
  \`keccak256(abi.encode(attestationType, _chainId, all _data fields except merkleProof, stateConnectorRound))\`
where \`attestationType\` (\`uint16\`) is a different constant for each of the methods below
(possible values are defined in attestation specs).
`;

  return `// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;


interface ISCProofVerifier {
${structs}
${indentText(commentText(proofVerificationComment), 4)}

${indentText(verifyProofFunctionSignatures, 4)}
}
`;
}

export function createSolidityIAttestationClient(definitions: AttestationTypeScheme[]) {
  const content = `${DEFAULT_GEN_FILE_HEADER}
${getSolidityIAttestationClient(definitions)}`;
  if (!fs.existsSync(SOLIDITY_GEN_INTERFACES_ROOT)) {
    fs.mkdirSync(SOLIDITY_GEN_INTERFACES_ROOT, { recursive: true });
  }
  fs.writeFileSync(`${SOLIDITY_GEN_INTERFACES_ROOT}/${I_ATTESTATION_CLIENT_FILE}`, content, "utf8");
}
