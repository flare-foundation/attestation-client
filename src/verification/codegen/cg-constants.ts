import { Options } from "prettier";

export const GENERATED_ROOT = "src/verification/generated";
export const GENERATED_TEST_ROOT = "test/generated";
export const CONTRACTS_ROOT = "contracts";
export const VERIFIERS_ROOT = "src/verification/verifiers";
export const SOLIDITY_GENERATED_ROOT = `contracts/generated`;
export const SOLIDITY_GEN_CONTRACTS_ROOT = `${SOLIDITY_GENERATED_ROOT}/contracts`;
export const SOLIDITY_GEN_INTERFACES_ROOT = `${SOLIDITY_GENERATED_ROOT}/interface`;
export const VERIFIERS_ROUTING_FILE = `${VERIFIERS_ROOT}/verifier_routing.ts`;
// export const VERIFIERS_IMPORTS = `${VERIFIERS_ROOT}/0-imports.ts`;
export const VERIFIER_FUNCTION_PREFIX = "verify";
export const WEB3_HASH_PREFIX_FUNCTION = "hash";
export const REQUEST_PARSE_PREFIX_FUNCTION = "parse";
export const REQUEST_ENCODE_PREFIX_FUNCTION = "encode";
export const REQUEST_EQUALS_PREFIX_FUNCTION = "equals";
export const ATTESTATION_TYPE_PREFIX = "AR";
export const DATA_HASH_TYPE_PREFIX = "DH";
export const SOLIDITY_VERIFICATION_FUNCTION_PREFIX = "verify";
export const ATT_REQUEST_TYPES_FILE = `${GENERATED_ROOT}/attestation-request-types.ts`;
export const ATT_HASH_TYPES_FILE = `${GENERATED_ROOT}/attestation-hash-types.ts`;
export const ATTESTATION_TYPES_ENUM_FILE = `${GENERATED_ROOT}/attestation-types-enum.ts`;
export const ATT_RANDOM_UTILS_FILE = `${GENERATED_ROOT}/attestation-random-utils.ts`;
export const ATT_HASH_UTILS_FILE = `${GENERATED_ROOT}/attestation-hash-utils.ts`;
export const ATT_REQUEST_PARSE_FILE = `${GENERATED_ROOT}/attestation-request-parse.ts`;
export const ATT_REQUEST_ENCODE_FILE = `${GENERATED_ROOT}/attestation-request-encode.ts`;
export const ATT_REQUEST_EQUALS_FILE = `${GENERATED_ROOT}/attestation-request-equals.ts`;
export const ATT_CLIENT_MOCK_TEST_FILE = `SCProofVerifierMock.test-contract.ts`;
export const ATT_REQ_PARSER_TEST_FILE = `AttestationRequestParser.test-contract.ts`;
export const I_ATTESTATION_CLIENT_FILE = `ISCProofVerifier.sol`;
export const ATTESTATION_CLIENT_BASE = `SCProofVerifierBase.sol`;
export const HASH_TEST_FILE = `HashTest.sol`;
export const VERIFIER_DTO_REQUEST_TYPE_FILE = "src/servers/verifier-server/src/dtos/v-request-types.dto.ts";
export const VERIFIER_DTO_HASH_TYPE_FILE = "src/servers/verifier-server/src/dtos/v-hash-types.dto.ts";
export const WEB_SERVER_DTO_REQUEST_TYPE_FILE = "src/servers/web-server/src/dtos/w-request-types.dto.ts";
export const WEB_SERVER_DTO_HASH_TYPE_FILE = "src/servers/web-server/src/dtos/w-hash-types.dto.ts";

export const CODEGEN_TAB = 3;
export const SOLIDITY_CODEGEN_TAB = 4;
export const DEFAULT_GEN_FILE_HEADER = `//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////
`;

export const SEMI_EDITABLE_GEN_FILE_HEADER = `//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////
`;

export const RANDOM_RESPONSE_HEADER = `//////////////////////////////////////////////////////////////
// Random attestation requests and resposes. Used for testing.
//////////////////////////////////////////////////////////////
`;

export const WEB3_HASH_FUNCTIONS_HEADER = `//////////////////////////////////////////////////////////////
// Hash functions for requests and responses for particular
// Attestation types.
//////////////////////////////////////////////////////////////
`;

export const REQUEST_PARSE_FUNCTIONS_HEADER = `//////////////////////////////////////////////////////////////
// Functions for parsing attestation requests from byte strings
//////////////////////////////////////////////////////////////
`;

export const REQUEST_ENCODE_FUNCTIONS_HEADER = `//////////////////////////////////////////////////////////////
// Functions for encoding attestation requests to byte strings
//////////////////////////////////////////////////////////////
`;

export const REQUEST_EQUALS_FUNCTIONS_HEADER = `//////////////////////////////////////////////////////////////
// Functions for comparing requests
//////////////////////////////////////////////////////////////
`;

// Prettier settings
export const PRETTIER_SETTINGS: Options = { trailingComma: "es5", tabWidth: 2, printWidth: 160, semi: true, singleQuote: false, parser: "typescript" };
export const PRETTIER_SETTINGS_SOL: Options = {
  // plugins: [parsers['solidity-parse']],
  parser: "solidity-parse",
  trailingComma: "es5",
  tabWidth: 4,
  printWidth: 110,
  proseWrap: 'preserve',
  semi: true,
  singleQuote: false,
};
