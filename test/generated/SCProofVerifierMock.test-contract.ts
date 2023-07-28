//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { MerkleTree } from "../../src/utils/data-structures/MerkleTree";
import { hexlifyBN } from "../../src/verification/attestation-types/attestation-types-helpers";
import {
  DHPayment,
  DHBalanceDecreasingTransaction,
  DHConfirmedBlockHeightExists,
  DHReferencedPaymentNonexistence,
} from "../../src/verification/generated/attestation-hash-types";
import {
  ARPayment,
  ARBalanceDecreasingTransaction,
  ARConfirmedBlockHeightExists,
  ARReferencedPaymentNonexistence,
} from "../../src/verification/generated/attestation-request-types";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";
import { getRandomResponseForType, getRandomRequest } from "../../src/verification/generated/attestation-random-utils";
import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionStore";
import { SCProofVerifierInstance, StateConnectorMockInstance } from "../../typechain-truffle";
import { getTestFile } from "../test-utils/test-utils";

const SCProofVerifier = artifacts.require("SCProofVerifier");
const StateConnectorMock = artifacts.require("StateConnectorMock");
const STATECONNECTOR_ROUND = 1;
const CHAIN_ID = SourceId.BTC;
const NUM_OF_HASHES = 100;

describe(`Attestestation Client Mock (${getTestFile(__filename)})`, function () {
  let attestationClient: SCProofVerifierInstance;
  let stateConnectorMock: StateConnectorMockInstance;
  let defStore: AttestationDefinitionStore;

  before(async () => {
    defStore = new AttestationDefinitionStore();
    await defStore.initialize();
  });

  beforeEach(async () => {
    stateConnectorMock = await StateConnectorMock.new();
    attestationClient = await SCProofVerifier.new(stateConnectorMock.address);
  });

  it("'Payment' test", async function () {
    const attestationType = AttestationType.Payment;
    const request = { attestationType, sourceId: CHAIN_ID } as ARPayment;

    const response = getRandomResponseForType(attestationType, STATECONNECTOR_ROUND) as DHPayment;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = defStore.dataHash(request, response);

    const dummyHash = web3.utils.randomHex(32);
    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);
    assert((await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND)) === hash);
    assert(await attestationClient.verifyPayment(CHAIN_ID, responseHex));

    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
    assert((await attestationClient.verifyPayment(CHAIN_ID, responseHex)) === false);
  });

  it("'BalanceDecreasingTransaction' test", async function () {
    const attestationType = AttestationType.BalanceDecreasingTransaction;
    const request = { attestationType, sourceId: CHAIN_ID } as ARBalanceDecreasingTransaction;

    const response = getRandomResponseForType(attestationType, STATECONNECTOR_ROUND) as DHBalanceDecreasingTransaction;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = defStore.dataHash(request, response);

    const dummyHash = web3.utils.randomHex(32);
    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);
    assert((await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND)) === hash);
    assert(await attestationClient.verifyBalanceDecreasingTransaction(CHAIN_ID, responseHex));

    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
    assert((await attestationClient.verifyBalanceDecreasingTransaction(CHAIN_ID, responseHex)) === false);
  });

  it("'ConfirmedBlockHeightExists' test", async function () {
    const attestationType = AttestationType.ConfirmedBlockHeightExists;
    const request = { attestationType, sourceId: CHAIN_ID } as ARConfirmedBlockHeightExists;

    const response = getRandomResponseForType(attestationType, STATECONNECTOR_ROUND) as DHConfirmedBlockHeightExists;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = defStore.dataHash(request, response);

    const dummyHash = web3.utils.randomHex(32);
    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);
    assert((await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND)) === hash);
    assert(await attestationClient.verifyConfirmedBlockHeightExists(CHAIN_ID, responseHex));

    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
    assert((await attestationClient.verifyConfirmedBlockHeightExists(CHAIN_ID, responseHex)) === false);
  });

  it("'ReferencedPaymentNonexistence' test", async function () {
    const attestationType = AttestationType.ReferencedPaymentNonexistence;
    const request = { attestationType, sourceId: CHAIN_ID } as ARReferencedPaymentNonexistence;

    const response = getRandomResponseForType(attestationType, STATECONNECTOR_ROUND) as DHReferencedPaymentNonexistence;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = defStore.dataHash(request, response);

    const dummyHash = web3.utils.randomHex(32);
    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);
    assert((await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND)) === hash);
    assert(await attestationClient.verifyReferencedPaymentNonexistence(CHAIN_ID, responseHex));

    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
    assert((await attestationClient.verifyReferencedPaymentNonexistence(CHAIN_ID, responseHex)) === false);
  });

  it("Merkle tree test", async function () {
    const verifications = [];
    for (let i = 0; i < NUM_OF_HASHES; i++) {
      const request = getRandomRequest();
      const response = getRandomResponseForType(request.attestationType, STATECONNECTOR_ROUND);
      verifications.push({
        request,
        response,
        hash: defStore.dataHash(request, response),
      });
    }
    const hashes = verifications.map((verification) => verification.hash);
    const tree = new MerkleTree(hashes);
    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, tree.root);
    for (const verification of verifications) {
      verification.response.stateConnectorRound = STATECONNECTOR_ROUND;
      const index = tree.sortedHashes.findIndex((hash) => hash === verification.hash);
      verification.response.merkleProof = tree.getProof(index);
      const responseHex = hexlifyBN(verification.response);
      switch (verification.request.attestationType) {
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
