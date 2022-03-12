import fs from "fs";
import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, DataHashScheme } from "../attestation-types/attestation-types";
import { tsTypeForSolidityType } from "../attestation-types/attestation-types-helpers";
import { ATTESTATION_TYPE_PREFIX, ATT_CLIENT_MOCK_TEST_FILE, ATT_UTILS_FILE, CODEGEN_TAB, DATA_HASH_TYPE_PREFIX, DEFAULT_GEN_FILE_HEADER, GENERATED_TEST_ROOT, RANDOM_RESPONSE_HEADER, VERIFIER_FUNCTION_PREFIX, WEB3_HASH_FUNCTIONS_HEADER, WEB3_HASH_PREFIX_FUNCTION } from "./cg-constants";
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
  assert(await attestationClient.${VERIFIER_FUNCTION_PREFIX}${definition.name}(CHAIN_ID, responseHex))

  await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
  assert(await attestationClient.${VERIFIER_FUNCTION_PREFIX}${definition.name}(CHAIN_ID, responseHex) === false);
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
import { hexlifyBN } from "../../lib/verification/codegen/cg-utils";
import { 
${dhImports} 
} from "../../lib/verification/generated/attestation-hash-types";
import { ${arImports} } from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { 
${tab()}getRandomResponseForType, 
${indentText(hashFunctionsImports, CODEGEN_TAB)}
} from "../../lib/verification/generated/attestation-utils";
import { AttestationClientSCInstance, StateConnectorMockInstance } from "../../typechain-truffle";

const AttestationClientSC = artifacts.require("AttestationClientSC");
const StateConnectorMock = artifacts.require("StateConnectorMock");
const STATECONNECTOR_ROUND = 1;
const CHAIN_ID = ChainType.BTC;

describe("Attestestation Client Mock", function () {
  let attestationClient: AttestationClientSCInstance;
  let stateConnectorMock: StateConnectorMockInstance;
  beforeEach(async () => {
    stateConnectorMock = await StateConnectorMock.new();
    attestationClient = await AttestationClientSC.new(stateConnectorMock.address);
  });

${indentText(itsForDefinitions, CODEGEN_TAB)}    
});  
`;

  if (!fs.existsSync(GENERATED_TEST_ROOT)) {
    fs.mkdirSync(GENERATED_TEST_ROOT, { recursive: true });
  }
  fs.writeFileSync(`${GENERATED_TEST_ROOT}/${ATT_CLIENT_MOCK_TEST_FILE}`, content, "utf8");
}
