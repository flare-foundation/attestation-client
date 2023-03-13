import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme, ATT_BYTES, DataHashScheme, SOURCE_ID_BYTES } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_CLIENT_MOCK_TEST_FILE,
  DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  GENERATED_TEST_ROOT,
  PRETTIER_SETTINGS,
  SOLIDITY_VERIFICATION_FUNCTION_PREFIX,
  WEB3_HASH_PREFIX_FUNCTION,
} from "./cg-constants";
import { trimStartNewline } from "./cg-utils";

export function randomHashItemValue(item: DataHashScheme, defaultReadObject = "{}") {
  const res = `${item.key}: randSol(${defaultReadObject}, "${item.key}", "${item.type}") as ${tsTypeForSolidityType(item.type)}`;
  return trimStartNewline(res);
}

export function genRandomResponseCode(definition: AttestationTypeScheme, defaultReadObject = "{}") {
  const responseFields = definition.dataHashDefinition.map((item) => randomHashItemValue(item, defaultReadObject)).join(",\n");
  const randomResponse = `
const response = {
${responseFields}      
} as ${DATA_HASH_TYPE_PREFIX}${definition.name};
`;
  return randomResponse;
}

export function genRandomResponseFunction(definition: AttestationTypeScheme) {
  return `
export function randomResponse${definition.name}() {
${genRandomResponseCode(definition)}
   return response;
}
`;
}

function genRandomResponseCase(definition: AttestationTypeScheme) {
  const result = `
case AttestationType.${definition.name}:
   return randomResponse${definition.name}();
`;
  return trimStartNewline(result);
}

export function genRandomResponseForAttestationTypeFunction(definitions: AttestationTypeScheme[]) {
  const attestationTypeCases = definitions.map((definition) => genRandomResponseCase(definition)).join("\n");
  return `
export function getRandomResponseForType(attestationType: AttestationType) {
	switch(attestationType) {
${attestationTypeCases}
		default:
			throw new Error("Wrong attestation type.")
  }   
}
`;
}

export function genHashCode(definition: AttestationTypeScheme, defaultRequest = "response", defaultResponse = "response") {
  const types = definition.dataHashDefinition.map((item) => `"${item.type}",\t\t// ${item.key}`).join("\n");
  const values = definition.dataHashDefinition.map((item) => `${defaultResponse}.${item.key}`).join(",\n");
  return `
const encoded = web3.eth.abi.encodeParameters(
	[
		"uint${ATT_BYTES * 8}",\t\t// attestationType
		"uint${SOURCE_ID_BYTES * 8}",\t\t// sourceId
${types}
	],
	[
		${defaultRequest}.attestationType,
		${defaultRequest}.sourceId,
${values}
	]
);   
`;
}

export function genWeb3HashFunction(definition: AttestationTypeScheme) {
  return `
export function ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request: ${ATTESTATION_TYPE_PREFIX}${definition.name}, response: ${DATA_HASH_TYPE_PREFIX}${
    definition.name
  }) {
${genHashCode(definition, "request", "response")}
	return web3.utils.soliditySha3(encoded)!;
}
`;
}

function genItForAttestationClientMock(definition: AttestationTypeScheme) {
  return `
it("'${definition.name}' test", async function () { 
  const attestationType = AttestationType.${definition.name};
  const request = { attestationType, sourceId: CHAIN_ID } as ${ATTESTATION_TYPE_PREFIX}${definition.name};

  const response = getRandomResponseForType(attestationType) as ${DATA_HASH_TYPE_PREFIX}${definition.name};
  response.stateConnectorRound = STATECONNECTOR_ROUND;
  response.merkleProof = [];

  const responseHex = hexlifyBN(response);

  const hash = ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request, response);

  const dummyHash = web3.utils.randomHex(32);
  await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);    
  assert(await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND) === hash);
  assert(await attestationClient.${SOLIDITY_VERIFICATION_FUNCTION_PREFIX}${definition.name}(CHAIN_ID, responseHex))

  await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
  assert(await attestationClient.${SOLIDITY_VERIFICATION_FUNCTION_PREFIX}${definition.name}(CHAIN_ID, responseHex) === false);
});
`;
}

function genVerificationCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
	assert(await attestationClient.${SOLIDITY_VERIFICATION_FUNCTION_PREFIX}${definition.name}(verification.request.sourceId, responseHex));
	break;`;
}

function genItForMerkleTest(definitions: AttestationTypeScheme[]) {
  const verificationCases = definitions.map((definition) => genVerificationCase(definition)).join("");
  return `
it("Merkle tree test", async function () {
	const verifications = [];
	for(let i = 0; i < NUM_OF_HASHES; i++) {
		const request = getRandomRequest();
		const response = getRandomResponseForType(request.attestationType);
		verifications.push({
			request,
			response,
			hash: dataHash(request, response)
		})
	};
	const hashes = verifications.map(verification => verification.hash);
	const tree = new MerkleTree(hashes);
	await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, tree.root);
	for(const verification of verifications) {
		verification.response.stateConnectorRound = STATECONNECTOR_ROUND;
		const index = tree.sortedHashes.findIndex(hash => hash === verification.hash);
		verification.response.merkleProof = tree.getProof(index);
		const responseHex = hexlifyBN(verification.response);
		switch(verification.request.attestationType) {
${verificationCases}
			default:
				throw new Error("Wrong attestation type");
		}
  }    
});
`;
}

export function createAttestationClientMockTest(definitions: AttestationTypeScheme[]) {
  const arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");
  const dhImports = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n");
  const hashFunctionsImports = definitions.map((definition) => `${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`).join(",\n");

  const itsForDefinitions = definitions.map((definition) => genItForAttestationClientMock(definition)).join("\n");
  const content = `${DEFAULT_GEN_FILE_HEADER}
import { MerkleTree } from "../../src/utils/data-structures/MerkleTree";
import { hexlifyBN } from "../../src/verification/attestation-types/attestation-types-helpers";
import { 
${dhImports} 
} from "../../src/verification/generated/attestation-hash-types";
import { 
${arImports} 
} from "../../src/verification/generated/attestation-request-types";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";
import { 
	getRandomResponseForType, 
	getRandomRequest,
} from "../../src/verification/generated/attestation-random-utils";
import { 
${hashFunctionsImports},
	dataHash
} from "../../src/verification/generated/attestation-hash-utils";
  
import { SCProofVerifierInstance, StateConnectorMockInstance } from "../../typechain-truffle";
import { getTestFile } from "../test-utils/test-utils";

const SCProofVerifier = artifacts.require("SCProofVerifier");
const StateConnectorMock = artifacts.require("StateConnectorMock");
const STATECONNECTOR_ROUND = 1;
const CHAIN_ID = SourceId.BTC;
const NUM_OF_HASHES = 100;

describe(\`Attestestation Client Mock (\$\{getTestFile(__filename)\})\`, function () {
  let attestationClient: SCProofVerifierInstance;
  let stateConnectorMock: StateConnectorMockInstance;
  beforeEach(async () => {
    stateConnectorMock = await StateConnectorMock.new();
    attestationClient = await SCProofVerifier.new(stateConnectorMock.address);
  });

${itsForDefinitions}

${genItForMerkleTest(definitions)}    
});  
`;

  if (!fs.existsSync(GENERATED_TEST_ROOT)) {
    fs.mkdirSync(GENERATED_TEST_ROOT, { recursive: true });
  }

  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(`${GENERATED_TEST_ROOT}/${ATT_CLIENT_MOCK_TEST_FILE}`, prettyContent, "utf8");
}
