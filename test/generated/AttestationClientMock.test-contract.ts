//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { MerkleTree } from "../../lib/utils/MerkleTree";
import { hexlifyBN } from "../../lib/verification/attestation-types/attestation-types-helpers";
import {
  DHPayment,
  DHBalanceDecreasingTransaction,
  DHConfirmedBlockHeightExists,
  DHReferencedPaymentNonexistence,
  DHTrustlineIssuance,
} from "../../lib/verification/generated/attestation-hash-types";
import {
  ARPayment,
  ARBalanceDecreasingTransaction,
  ARConfirmedBlockHeightExists,
  ARReferencedPaymentNonexistence,
  ARTrustlineIssuance,
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { SourceId } from "../../lib/verification/sources/sources";
import { getRandomResponseForType, getRandomRequest } from "../../lib/verification/generated/attestation-random-utils";
import {
  hashPayment,
  hashBalanceDecreasingTransaction,
  hashConfirmedBlockHeightExists,
  hashReferencedPaymentNonexistence,
  hashTrustlineIssuance,
  dataHash,
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
    const attestationType = AttestationType.Payment;
    const request = { attestationType, sourceId: CHAIN_ID } as ARPayment;

    const response = getRandomResponseForType(attestationType) as DHPayment;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = hashPayment(request, response);

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

    const response = getRandomResponseForType(attestationType) as DHBalanceDecreasingTransaction;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = hashBalanceDecreasingTransaction(request, response);

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

    const response = getRandomResponseForType(attestationType) as DHConfirmedBlockHeightExists;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = hashConfirmedBlockHeightExists(request, response);

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

    const response = getRandomResponseForType(attestationType) as DHReferencedPaymentNonexistence;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = hashReferencedPaymentNonexistence(request, response);

    const dummyHash = web3.utils.randomHex(32);
    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);
    assert((await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND)) === hash);
    assert(await attestationClient.verifyReferencedPaymentNonexistence(CHAIN_ID, responseHex));

    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
    assert((await attestationClient.verifyReferencedPaymentNonexistence(CHAIN_ID, responseHex)) === false);
  });

  it("'TrustlineIssuance' test", async function () {
    const attestationType = AttestationType.TrustlineIssuance;
    const request = { attestationType, sourceId: CHAIN_ID } as ARTrustlineIssuance;

    const response = getRandomResponseForType(attestationType) as DHTrustlineIssuance;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    const responseHex = hexlifyBN(response);

    const hash = hashTrustlineIssuance(request, response);

    const dummyHash = web3.utils.randomHex(32);
    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, hash);
    assert((await stateConnectorMock.merkleRoots(STATECONNECTOR_ROUND)) === hash);
    assert(await attestationClient.verifyTrustlineIssuance(CHAIN_ID, responseHex));

    await stateConnectorMock.setMerkleRoot(STATECONNECTOR_ROUND, dummyHash);
    assert((await attestationClient.verifyTrustlineIssuance(CHAIN_ID, responseHex)) === false);
  });

  it("Merkle tree test", async function () {
    const verifications = [];
    for (let i = 0; i < NUM_OF_HASHES; i++) {
      const request = getRandomRequest();
      const response = getRandomResponseForType(request.attestationType);
      verifications.push({
        request,
        response,
        hash: dataHash(request, response),
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
        case AttestationType.TrustlineIssuance:
          assert(await attestationClient.verifyTrustlineIssuance(verification.request.sourceId, responseHex));
          break;
        default:
          throw new Error("Wrong attestation type");
      }
    }
  });
});
