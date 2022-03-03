export const GENERATED_ROOT = "lib/verification/generated";
export const CONTRACTS_ROOT = "contracts";
export const VERIFIERS_ROOT = "lib/verification/verifiers";
export const SOLIDITY_GENERATED_ROOT = `${GENERATED_ROOT}/solidity`
export const VERIFIERS_ROUTING_FILE = `${VERIFIERS_ROOT}/verifier_routing.ts`;
export const VERIFIER_FUNCTION_PREFIX = "verify";
export const ATTESTATION_TYPE_PREFIX = "AR";
export const DATA_HASH_TYPE_PREFIX = "DH";
export const ATT_TYPE_DEFINITIONS_ROOT = "lib/verification/attestation-types";
export const ATT_REQUEST_TYPES_FILE = `${GENERATED_ROOT}/attestation-request-types.ts`;
export const ATT_HASH_TYPES_FILE = `${GENERATED_ROOT}/attestation-hash-types.ts`;
export const ATTESTATION_TYPES_ENUM_FILE = `${GENERATED_ROOT}/attestation-types-enum.ts`;
export const I_ATTESTATION_CLIENT_FILE = `${SOLIDITY_GENERATED_ROOT}/IAttestationClient.sol`;
export const HASH_TEST_FILE = `${CONTRACTS_ROOT}/HashTest.sol`

export const CODEGEN_TAB = 3;
export const DEFAULT_GEN_FILE_HEADER = 
`//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////
`
