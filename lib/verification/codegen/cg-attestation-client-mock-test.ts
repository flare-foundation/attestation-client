import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATTESTATION_TYPE_PREFIX, ATT_CLIENT_MOCK_TEST_FILE, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, GENERATED_TEST_ROOT, SOLIDITY_VERIFICATION_FUNCTION_PREFIX, WEB3_HASH_PREFIX_FUNCTION } from "./cg-constants";
import { indentText, tab, trimStartNewline } from "./cg-utils";


export function randomHashItemValue(item: DataHashScheme, defaultReadObject = "{}") {
  let res = `${item.key}: randSol(${defaultReadObject}, "${item.key}", "${item.type}") as ${tsTypeForSolidityType(item.type)}`
  return trimStartNewline(res);
}

// Todo utils knjižnica, ki ima za vsak tip random response
// Hexlify za vsak tip
// funkcija za enkodiranje vsakega od tipov

export function genRandomResponseCode(definition: AttestationTypeScheme, defaultReadObject = "{}") {
  let responseFields = definition.dataHashDefinition.map(item => indentText(randomHashItemValue(item, defaultReadObject), CODEGEN_TAB)).join(",\n");
  let randomResponse =
    `
let response = {
${responseFields}      
} as ${DATA_HASH_TYPE_PREFIX}${definition.name};
`
  return randomResponse;
}

export function genRandomResponseFunction(definition: AttestationTypeScheme) {
  return `
export function randomResponse${definition.name}() {
${indentText(genRandomResponseCode(definition), CODEGEN_TAB)}
   return response;
}
`
}

function genRandomResponseCase(definition: AttestationTypeScheme) {
  let result = `
case AttestationType.${definition.name}:
   return randomResponse${definition.name}();
`;
  return trimStartNewline(result);
}


export function genRandomResponseForAttestationTypeFunction(definitions: AttestationTypeScheme[]) {
  let attestationTypeCases = definitions.map(definition => indentText(genRandomResponseCase(definition), CODEGEN_TAB * 2)).join("\n")
  return `
export function getRandomResponseForType(attestationType: AttestationType) {
${tab()}switch(attestationType) {
${attestationTypeCases}
${tab()}${tab()}default:
${tab()}${tab()}${tab()}throw new Error("Wrong attestation type.")
  }   
}
`
}

export function genHashCode(definition: AttestationTypeScheme, defaultRequest = "response", defaultResponse = "response") {
  let types = definition.dataHashDefinition.map(item => `"${item.type}",\t\t// ${item.key}`).join("\n");
  let values = definition.dataHashDefinition.map(item => `${defaultResponse}.${item.key}`).join(",\n");
  return `
let encoded = web3.eth.abi.encodeParameters(
${tab()}[
${tab()}${tab()}"uint${ATT_BYTES * 8}",\t\t// attestationType
${tab()}${tab()}"uint${CHAIN_ID_BYTES * 8}",\t\t// chainId
${indentText(types, CODEGEN_TAB * 2)}
${tab()}],
${tab()}[
${tab()}${tab()}${defaultRequest}.attestationType,
${tab()}${tab()}${defaultRequest}.chainId,
${indentText(values, CODEGEN_TAB * 2)}
${tab()}]
);   
`
}

export function genWeb3HashFunction(definition: AttestationTypeScheme) {
  return `
export function ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request: ${ATTESTATION_TYPE_PREFIX}${definition.name}, response: ${DATA_HASH_TYPE_PREFIX}${definition.name}) {
${indentText(genHashCode(definition, "request", "response"), CODEGEN_TAB)}
${tab()}return web3.utils.soliditySha3(encoded)!;
}
`
}

function genItForAttestationClientMock(definition: AttestationTypeScheme) {
  return `
it("'${definition.name}' test", async function () { 
  let attestationType = AttestationType.${definition.name};
  let request = { attestationType, chainId: CHAIN_ID } as ${ATTESTATION_TYPE_PREFIX}${definition.name};

  let response = getRandomResponseForType(attestationType) as ${DATA_HASH_TYPE_PREFIX}${definition.name};
  response.stateConnectorRound = STATECONNECTOR_ROUND;
  response.merkleProof = [];

  let responseHex = hexlifyBN(response);

  let hash = ${WEB3_HASH_PREFIX_FUNCTION}${definition.name}(request, response);

  let dummyHash = web3.utils.randomHex(32);
  await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);    
  assert(await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND) === hash);
  assert(await attestationClient.${SOLIDITY_VERIFICATION_FUNCTION_PREFIX}${definition.name}(CHAIN_ID, responseHex))

  await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
  assert(await attestationClient.${SOLIDITY_VERIFICATION_FUNCTION_PREFIX}${definition.name}(CHAIN_ID, responseHex) === false);
});
`
}

function genVerificationCase(definition: AttestationTypeScheme) {
  return `
case AttestationType.${definition.name}:
${tab()}assert(await attestationClient.${SOLIDITY_VERIFICATION_FUNCTION_PREFIX}${definition.name}(verification.request.chainId, responseHex));
${tab()}break;`
}


function genItForMerkleTest(definitions: AttestationTypeScheme[]) {
  let verificationCases = definitions.map(definition => genVerificationCase(definition)).join("");
  return `
it("Merkle tree test", async function () {
${tab()}let verifications = [];
${tab()}for(let i = 0; i < NUM_OF_HASHES; i++) {
${tab()}${tab()}let request = getRandomRequest();
${tab()}${tab()}let response = getRandomResponseForType(request.attestationType);
${tab()}${tab()}verifications.push({
${tab()}${tab()}${tab()}request,
${tab()}${tab()}${tab()}response,
${tab()}${tab()}${tab()}hash: dataHash(request, response)
${tab()}${tab()}})
${tab()}};
${tab()}let hashes = verifications.map(verification => verification.hash);
${tab()}const tree = new MerkleTree(hashes);
${tab()}await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, tree.root);
${tab()}for(let verification of verifications) {
${tab()}${tab()}verification.response.stateConnectorRound = STATECONNECTOR_ROUND;
${tab()}${tab()}let index = tree.sortedHashes.findIndex(hash => hash === verification.hash);
${tab()}${tab()}verification.response.merkleProof = tree.getProof(index);
${tab()}${tab()}let responseHex = hexlifyBN(verification.response);
${tab()}${tab()}switch(verification.request.attestationType) {
${indentText(verificationCases, CODEGEN_TAB*3)}
${tab()}${tab()}${tab()}default:
${tab()}${tab()}${tab()}${tab()}throw new Error("Wrong attestation type");
${tab()}${tab()}}
  }    
});
`
}

export function createAttestationClientMockTest(definitions: AttestationTypeScheme[]) {
  let arImports = definitions.map(definition => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n")
  let dhImports = definitions.map(definition => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n")
  let hashFunctionsImports = definitions.map(definition => `${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`).join(",\n")

  let itsForDefinitions = definitions.map(definition => genItForAttestationClientMock(definition)).join("\n");
  let content = `${DEFAULT_GEN_FILE_HEADER}
import { ChainType } from "flare-mcc";
import { MerkleTree } from "../../lib/utils/MerkleTree";
import { hexlifyBN } from "../../lib/verification/codegen/cg-utils";
import { 
${indentText(dhImports, CODEGEN_TAB)} 
} from "../../lib/verification/generated/attestation-hash-types";
import { 
${indentText(arImports, CODEGEN_TAB)} 
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { 
${tab()}getRandomResponseForType, 
${indentText(hashFunctionsImports, CODEGEN_TAB)},
${tab()}getRandomRequest,
${tab()}dataHash
} from "../../lib/verification/generated/attestation-utils";
import { AttestationClientSCInstance, StateConnectorMockInstance } from "../../typechain-truffle";

const AttestationClientSC = artifacts.require("AttestationClientSC");
const StateConnectorMock = artifacts.require("StateConnectorMock");
const STATECONNECTOR_ROUND = 1;
const CHAIN_ID = ChainType.BTC;
const NUM_OF_HASHES = 100;

describe("Attestestation Client Mock", function () {
  let attestationClient: AttestationClientSCInstance;
  let stateConnectorMock: StateConnectorMockInstance;
  beforeEach(async () => {
    stateConnectorMock = await StateConnectorMock.new();
    attestationClient = await AttestationClientSC.new(stateConnectorMock.address);
  });

${indentText(itsForDefinitions, CODEGEN_TAB)}

${indentText(genItForMerkleTest(definitions), CODEGEN_TAB)}    
});  
`;

  if (!fs.existsSync(GENERATED_TEST_ROOT)) {
    fs.mkdirSync(GENERATED_TEST_ROOT, { recursive: true });
  }
  fs.writeFileSync(`${GENERATED_TEST_ROOT}/${ATT_CLIENT_MOCK_TEST_FILE}`, content, "utf8");
}
