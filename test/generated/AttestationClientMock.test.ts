//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ChainType } from "flare-mcc";
import { hexlifyBN } from "../../lib/verification/codegen/cg-utils";
import { 
DHPayment,
DHBalanceDecreasingTransaction,
DHBlockHeightExists,
DHReferencedPaymentNonexistence 
} from "../../lib/verification/generated/attestation-hash-types";
import { ARPayment,
ARBalanceDecreasingTransaction,
ARBlockHeightExists,
ARReferencedPaymentNonexistence } from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { 
   getRandomResponseForType, 
   hashPayment,
   hashBalanceDecreasingTransaction,
   hashBlockHeightExists,
   hashReferencedPaymentNonexistence
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

   it("'Payment' test", async function () {
     let attestationType = AttestationType.Payment;
     let request = { attestationType, chainId: CHAIN_ID } as ARPayment;
   
     let response = getRandomResponseForType(attestationType) as DHPayment;
     response.stateConnectorRound = STATECONNECTOR_ROUND;
     response.merkleProof = [];
   
     let responseHex = hexlifyBN(response);
   
     let hash = hashPayment(request, response);
   
     let dummyHash = web3.utils.randomHex(32);
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);    
     assert(await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND) === hash);
     assert(await attestationClient.verifyPayment(CHAIN_ID, responseHex))
   
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
     assert(await attestationClient.verifyPayment(CHAIN_ID, responseHex) === false);
   });
   
   
   it("'BalanceDecreasingTransaction' test", async function () {
     let attestationType = AttestationType.BalanceDecreasingTransaction;
     let request = { attestationType, chainId: CHAIN_ID } as ARBalanceDecreasingTransaction;
   
     let response = getRandomResponseForType(attestationType) as DHBalanceDecreasingTransaction;
     response.stateConnectorRound = STATECONNECTOR_ROUND;
     response.merkleProof = [];
   
     let responseHex = hexlifyBN(response);
   
     let hash = hashBalanceDecreasingTransaction(request, response);
   
     let dummyHash = web3.utils.randomHex(32);
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);    
     assert(await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND) === hash);
     assert(await attestationClient.verifyBalanceDecreasingTransaction(CHAIN_ID, responseHex))
   
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
     assert(await attestationClient.verifyBalanceDecreasingTransaction(CHAIN_ID, responseHex) === false);
   });
   
   
   it("'BlockHeightExists' test", async function () {
     let attestationType = AttestationType.BlockHeightExists;
     let request = { attestationType, chainId: CHAIN_ID } as ARBlockHeightExists;
   
     let response = getRandomResponseForType(attestationType) as DHBlockHeightExists;
     response.stateConnectorRound = STATECONNECTOR_ROUND;
     response.merkleProof = [];
   
     let responseHex = hexlifyBN(response);
   
     let hash = hashBlockHeightExists(request, response);
   
     let dummyHash = web3.utils.randomHex(32);
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);    
     assert(await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND) === hash);
     assert(await attestationClient.verifyBlockHeightExists(CHAIN_ID, responseHex))
   
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
     assert(await attestationClient.verifyBlockHeightExists(CHAIN_ID, responseHex) === false);
   });
   
   
   it("'ReferencedPaymentNonexistence' test", async function () {
     let attestationType = AttestationType.ReferencedPaymentNonexistence;
     let request = { attestationType, chainId: CHAIN_ID } as ARReferencedPaymentNonexistence;
   
     let response = getRandomResponseForType(attestationType) as DHReferencedPaymentNonexistence;
     response.stateConnectorRound = STATECONNECTOR_ROUND;
     response.merkleProof = [];
   
     let responseHex = hexlifyBN(response);
   
     let hash = hashReferencedPaymentNonexistence(request, response);
   
     let dummyHash = web3.utils.randomHex(32);
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);    
     assert(await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND) === hash);
     assert(await attestationClient.verifyReferencedPaymentNonexistence(CHAIN_ID, responseHex))
   
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
     assert(await attestationClient.verifyReferencedPaymentNonexistence(CHAIN_ID, responseHex) === false);
   });    
});  
