//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { MerkleTree } from "../../lib/utils/MerkleTree";
import { hexlifyBN } from "../../lib/verification/codegen/cg-utils";
import { 
   DHPayment,
   DHBalanceDecreasingTransaction,
   DHConfirmedBlockHeightExists,
   DHReferencedPaymentNonexistence 
} from "../../lib/verification/generated/attestation-hash-types";
import { 
   ARPayment,
   ARBalanceDecreasingTransaction,
   ARConfirmedBlockHeightExists,
   ARReferencedPaymentNonexistence 
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { SourceId } from "../../lib/verification/sources/sources";
import { 
   getRandomResponseForType, 
   getRandomRequest,
} from "../../lib/verification/generated/attestation-random-utils";
import { 
   hashPayment,
   hashBalanceDecreasingTransaction,
   hashConfirmedBlockHeightExists,
   hashReferencedPaymentNonexistence,
   dataHash
} from "../../lib/verification/generated/attestation-hash-utils";
  
import { AttestationClientSCInstance, StateConnectorMockInstance } from "../../typechain-truffle";

const AttestationClientSC = artifacts.require("AttestationClientSC");
const StateConnectorMock = artifacts.require("StateConnectorMock");
const STATECONNECTOR_ROUND = 1;
const CHAIN_ID = SourceId.BTC;
const NUM_OF_HASHES = 100;

describe("Attestestation Client Mock", function () {
  let attestationClient: AttestationClientSCInstance;
  let stateConnectorMock: StateConnectorMockInstance;
  beforeEach(async () => {
    stateConnectorMock = await StateConnectorMock.new();
    attestationClient = await AttestationClientSC.new(stateConnectorMock.address);
  });

   it("'Payment' test", async function () { 
     let attestationType = AttestationType.Payment;
     let request = { attestationType, sourceId: CHAIN_ID } as ARPayment;
   
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
     let request = { attestationType, sourceId: CHAIN_ID } as ARBalanceDecreasingTransaction;
   
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
   
   
   it("'ConfirmedBlockHeightExists' test", async function () { 
     let attestationType = AttestationType.ConfirmedBlockHeightExists;
     let request = { attestationType, sourceId: CHAIN_ID } as ARConfirmedBlockHeightExists;
   
     let response = getRandomResponseForType(attestationType) as DHConfirmedBlockHeightExists;
     response.stateConnectorRound = STATECONNECTOR_ROUND;
     response.merkleProof = [];
   
     let responseHex = hexlifyBN(response);
   
     let hash = hashConfirmedBlockHeightExists(request, response);
   
     let dummyHash = web3.utils.randomHex(32);
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);    
     assert(await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND) === hash);
     assert(await attestationClient.verifyConfirmedBlockHeightExists(CHAIN_ID, responseHex))
   
     await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
     assert(await attestationClient.verifyConfirmedBlockHeightExists(CHAIN_ID, responseHex) === false);
   });
   
   
   it("'ReferencedPaymentNonexistence' test", async function () { 
     let attestationType = AttestationType.ReferencedPaymentNonexistence;
     let request = { attestationType, sourceId: CHAIN_ID } as ARReferencedPaymentNonexistence;
   
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

   it("Merkle tree test", async function () {
      let verifications = [];
      for(let i = 0; i < NUM_OF_HASHES; i++) {
         let request = getRandomRequest();
         let response = getRandomResponseForType(request.attestationType);
         verifications.push({
            request,
            response,
            hash: dataHash(request, response)
         })
      };
      let hashes = verifications.map(verification => verification.hash);
      const tree = new MerkleTree(hashes);
      await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, tree.root);
      for(let verification of verifications) {
         verification.response.stateConnectorRound = STATECONNECTOR_ROUND;
         let index = tree.sortedHashes.findIndex(hash => hash === verification.hash);
         verification.response.merkleProof = tree.getProof(index);
         let responseHex = hexlifyBN(verification.response);
         switch(verification.request.attestationType) {
            case AttestationType.Payment:
               assert(await attestationClient.verifyPayment(verification.request.sourceId, responseHex));
               break;
            case AttestationType.BalanceDecreasingTransaction:
               assert(await attestationClient.verifyBalanceDecreasingTransaction(verification.request.sourceId, responseHex));
               break;
            case AttestationType.ConfirmedBlockHeightExists:
               assert(await attestationClient.verifyConfirmedBlockHeightExists(verification.request.sourceId, responseHex));
               break;
            case AttestationType.ReferencedPaymentNonexistence:
               assert(await attestationClient.verifyReferencedPaymentNonexistence(verification.request.sourceId, responseHex));
               break;
            default:
               throw new Error("Wrong attestation type");
         }
     }    
   });    
});  
