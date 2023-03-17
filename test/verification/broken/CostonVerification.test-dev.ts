// Make a tunnel to database
// Run the test
// DOTENV=DEV SOURCE_ID=ALGO CONFIG_PATH=.secure.dev NODE_ENV=development yarn hardhat test test/verification/CostonVerification.test-dev.ts --network coston

import { ChainType, MCC, MccClient } from "@flarenetwork/mcc";
import axios from "axios";
import { ChainConfig } from "../../../src/attester/configs/ChainConfig";
// import { ListChainConfig } from "../../../src/attester/configs/ListChainConfig";
import { IndexedQueryManagerOptions } from "../../../src/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../../src/indexed-query-manager/IndexedQueryManager";
import { createTestAttestationFromRequest } from "../../../src/indexed-query-manager/random-attestation-requests/random-ar";
import { VerifierServerConfig } from "../../../src/servers/verifier-server/src/config-models/VerifierServerConfig";
import { readSecureConfig } from "../../../src/utils/config/configSecure";
import { MerkleTree } from "../../../src/utils/data-structures/MerkleTree";
import { DatabaseService } from "../../../src/utils/database/DatabaseService";
import { getUnixEpochTimestamp } from "../../../src/utils/helpers/utils";
import { getGlobalLogger } from "../../../src/utils/logging/logger";
import { hexlifyBN } from "../../../src/verification/attestation-types/attestation-types-helpers";
import { parseRequest } from "../../../src/verification/generated/attestation-request-parse";
import { AttestationType } from "../../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../../src/verification/sources/sources";
import { verifyAttestation } from "../../../src/verification/verifiers/verifier_routing";
import { StateConnectorInstance } from "../../../typechain-truffle";
import { SCProofVerifierInstance } from "../../../typechain-truffle/SCProofVerifier";

const SOURCE_ID = SourceId[process.env.SOURCE_ID] ?? SourceId.XRP;

describe(`Coston verification test (${SourceId[SOURCE_ID]})`, () => {
  let currentBufferNumber = 0;
  let BUFFER_TIMESTAMP_OFFSET: number;
  let BUFFER_WINDOW: number;
  let TOTAL_STORED_PROOFS: number;
  let stateConnector: StateConnectorInstance;
  let client: MccClient;
  let indexedQueryManager: IndexedQueryManager;
  let attestationClient: SCProofVerifierInstance;
  let chainName: string;
  let chainIndexerConfig: ChainConfig;

  const StateConnector = artifacts.require("StateConnector");
  const SCProofVerifier = artifacts.require("SCProofVerifier");

  before(async () => {
    process.env.TEST_CREDENTIALS = "1"
    stateConnector = await StateConnector.at("0x1000000000000000000000000000000000000001");
    attestationClient = await SCProofVerifier.at("0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf");
    BUFFER_TIMESTAMP_OFFSET = (await stateConnector.BUFFER_TIMESTAMP_OFFSET()).toNumber();
    BUFFER_WINDOW = (await stateConnector.BUFFER_WINDOW()).toNumber();
    TOTAL_STORED_PROOFS = (await stateConnector.TOTAL_STORED_PROOFS()).toNumber();
    const now = getUnixEpochTimestamp();
    currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
    console.log(`Current buffer number ${currentBufferNumber}, mod: ${currentBufferNumber % TOTAL_STORED_PROOFS}`);
    chainName = SourceId[SOURCE_ID];
    // const configIndexer = await readSecureConfig(new ListChainConfig(), "chains"); // BROKEN
    // chainIndexerConfig = configIndexer.chains.find((item) => item.name === chainName);
    const verifierCredentials = await readSecureConfig(new VerifierServerConfig(), `${SOURCE_ID.toLowerCase()}-verifier`);

    
    console.log( "***1");    


    client = MCC.Client(SOURCE_ID, {
      ...chainIndexerConfig.mccCreate,
      rateLimitOptions: chainIndexerConfig.rateLimitOptions,
    });

    const dbService = new DatabaseService(getGlobalLogger(), verifierCredentials.indexerDatabase, "indexer");
    await dbService.connect();
    const options: IndexedQueryManagerOptions = {
      chainType: SOURCE_ID as ChainType,
      numberOfConfirmations: () => {
        return chainIndexerConfig.numberOfConfirmations;
      },
      entityManager: dbService.manager,
    } as IndexedQueryManagerOptions;
    indexedQueryManager = new IndexedQueryManager(options);
  });

  after(async () => {
    delete process.env.TEST_CREDENTIALS;
  });

  it("Should verify that merkle roots match.", async () => {
    const totalBuffers = (await stateConnector.totalBuffers()).toNumber();
    const N0 = 2;
    const CHECK_COUNT = 1000;
    let cnt = 2;
    for (let N = N0; N < CHECK_COUNT; N++) {
      const roundId = totalBuffers - N; //currentBufferNumber - N;
      const resp = await axios.get(`https://attestation.flare.network/attester-api/proof/votes-for-round/${roundId}`);
      const data = resp.data.data;
      if (data.length === 0) {
        console.log(`No attestations in roundId ${roundId}`);
        // return;
        continue;
      }
      const hashes: string[] = data.map((item) => item.hash) as string[];
      const tree = new MerkleTree(hashes);

      const stateConnectorMerkleRoot = await stateConnector.merkleRoots((roundId + 2) % TOTAL_STORED_PROOFS);

      console.log(`${cnt}\t${roundId}\t${data.length}\t${stateConnectorMerkleRoot === tree.root ? "OK" : "MISMATCH"}`);
      cnt++;
    }
  });

  // Used for debugging specific requests
  it("Specific request check", async () => {
    const request = "0x000100000004d35d367c3abd09d92c956c9e73d73fd9e7da10ba209b807829b7093a9a55f62f145848860e2f9e81c6c21eaeaa0fcbfe2d4876b872c09ea2294e19a965b92c420000";
    const roundId = 366582;

    const parsed = parseRequest(request);
    // console.log(parsed)
    // let roundId = currentBufferNumber - 2;

    console.log( "***1");    

    const att = createTestAttestationFromRequest(parsed, roundId);
    const result = await verifyAttestation(client, att, indexedQueryManager);

    console.log(`Status ${result.status}`);
    // console.log(`Block number: ${result.response?.blockNumber?.toString()}`);
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    console.log(`Last confirmed block: ${lastConfirmedBlock}`);
  });

  it("Specific parsed request check", async () => {
    const roundId = 161893;

    const parsed = {
      attestationType: 1,
      sourceId: 2,
      messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",   // TODO change
      id: "0x851f2660dff77e9e54d220ca6d06071ef951612bfbcacc8a35fe20380bacc384",
      inUtxo: "0x0",
      utxo: "0x0",
    };

    const att = createTestAttestationFromRequest(parsed, roundId);
    const result = await verifyAttestation(client, att, indexedQueryManager);

    console.log(hexlifyBN(result));
    console.log(`Status ${result.status}`);
    // console.log(`Block number: ${result.response?.blockNumber?.toString()}`);
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    console.log(`Last confirmed block: ${lastConfirmedBlock}`);
  });

  it.skip("Test specific round Merkle proofs", async () => {
    const roundId = 161166;
    const resp = await axios.get(`https://attestation.flare.network/attester-api/proof/votes-for-round/${roundId}`);
    const data = resp.data.data;
    if (data.length === 0) {
      console.log(`No attestations in roundId ${roundId}`);
      return;
    }

    const hashes: string[] = data.map((item) => item.hash) as string[];
    const tree = new MerkleTree(hashes);

    for (let i = 0; i < data.length; i++) {
      const chosenRequest = data[i];
      const chosenHash = chosenRequest.hash;
      const index = tree.sortedHashes.findIndex((hash) => hash === chosenHash);
      const response = chosenRequest.response;
      response.stateConnectorRound = roundId + 2;
      response.merkleProof = tree.getProof(index);
      const responseHex = hexlifyBN(response);
      let result: boolean;
      switch (chosenRequest.request.attestationType) {
        case AttestationType.Payment:
          result = await attestationClient.verifyPayment(chosenRequest.request.sourceId, responseHex);
          break;
        case AttestationType.BalanceDecreasingTransaction:
          result = await attestationClient.verifyBalanceDecreasingTransaction(chosenRequest.request.sourceId, responseHex);
          break;
        case AttestationType.ConfirmedBlockHeightExists:
          result = await attestationClient.verifyConfirmedBlockHeightExists(chosenRequest.request.sourceId, responseHex);
          break;
        case AttestationType.ReferencedPaymentNonexistence:
          result = await attestationClient.verifyReferencedPaymentNonexistence(chosenRequest.request.sourceId, responseHex);
          break;
        default:
          throw new Error("Wrong attestation type");
      }
      console.log(`${i}/${data.length}\t${result}`);
    }
  });
});
