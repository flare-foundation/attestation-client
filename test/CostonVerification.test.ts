// Make a tunell to database:
// ssh -N -L 3337:127.0.0.1:3306 ubuntu@34.89.247.51
// Run the test
// CONFIG_PATH=dev NODE_ENV=development yarn hardhat test test/CostonVerification.test.ts --network coston

import { ChainType, MCC, MccClient } from "flare-mcc";
import { AttesterClientConfiguration, AttesterCredentials } from "../lib/attester/AttesterClientConfiguration";
import { ChainsConfiguration } from "../lib/chain/ChainConfiguration";
import { IndexedQueryManagerOptions } from "../lib/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../lib/indexed-query-manager/IndexedQueryManager";
import { createTestAttestationFromRequest } from "../lib/indexed-query-manager/random-attestation-requests/random-ar";
import { IndexerConfiguration } from "../lib/indexer/IndexerConfiguration";
import { readConfig, readCredentials } from "../lib/utils/config";
import { DatabaseService } from "../lib/utils/databaseService";
import { getGlobalLogger } from "../lib/utils/logger";
import { MerkleTree } from "../lib/utils/MerkleTree";
import { getUnixEpochTimestamp } from "../lib/utils/utils";
import { hexlifyBN } from "../lib/verification/attestation-types/attestation-types-helpers";
import { parseRequest } from "../lib/verification/generated/attestation-request-parse";
import { AttestationType } from "../lib/verification/generated/attestation-types-enum";
import { verifyAttestation } from "../lib/verification/verifiers/verifier_routing";
import { AttestationClientSCInstance, StateConnectorInstance } from "../typechain-truffle";

const axios = require('axios');

describe("Coston verification test", () => {
  let currentBufferNumber = 0;
  let BUFFER_TIMESTAMP_OFFSET: number;
  let BUFFER_WINDOW: number;
  let TOTAL_STORED_PROOFS: number;
  let stateConnector: StateConnectorInstance;
  let client: MccClient;
  let indexedQueryManager: IndexedQueryManager;
  let attestationClient: AttestationClientSCInstance;

  const StateConnector = artifacts.require("StateConnector");
  const AttestationClientSC = artifacts.require("AttestationClientSC");

  before(async () => {
    stateConnector = await StateConnector.at("0x947c76694491d3fD67a73688003c4d36C8780A97");
    attestationClient = await AttestationClientSC.at("0xFdd0daaC0dc2eb8bD35eBdD8611d5322281fC527");
    BUFFER_TIMESTAMP_OFFSET = (await stateConnector.BUFFER_TIMESTAMP_OFFSET()).toNumber();
    BUFFER_WINDOW = (await stateConnector.BUFFER_WINDOW()).toNumber();
    TOTAL_STORED_PROOFS = (await stateConnector.TOTAL_STORED_PROOFS()).toNumber();
    let now = getUnixEpochTimestamp();
    currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
    console.log(`Current buffer number ${currentBufferNumber}, mod: ${currentBufferNumber % TOTAL_STORED_PROOFS}`)

    let configIndexer = readConfig(new ChainsConfiguration(), "chains");
    let chainIndexerConfig = configIndexer.chains.find(item => item.name === 'BTC')
    let configAttestationClient = readConfig(new AttesterClientConfiguration(), "attester");
    let attesterCredentials = readCredentials(new AttesterCredentials(), "attester");

    client = MCC.Client(ChainType.BTC, {
      ...chainIndexerConfig.mccCreate,
      rateLimitOptions: chainIndexerConfig.rateLimitOptions
    });

    // console.log(attesterCredentials.indexerDatabase)
    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.BTC,
      numberOfConfirmations: () => { return 6; },
      maxValidIndexerDelaySec: 10,
      dbService: new DatabaseService(getGlobalLogger(), attesterCredentials.indexerDatabase, "indexer"),
      windowStartTime: (roundId: number) => {
        // todo: read this from DAC
        const queryWindowInSec = 86400;
        return BUFFER_TIMESTAMP_OFFSET + roundId * BUFFER_WINDOW - queryWindowInSec;
      }
    } as IndexedQueryManagerOptions;
    indexedQueryManager = new IndexedQueryManager(options);
    await indexedQueryManager.dbService.waitForDBConnection()

  });

  it("Should verify that merkle roots match.", async () => {
    // let roundId = (n: number) => (currentBufferNumber - n) % TOTAL_STORED_PROOFS;

    let totalBuffers = (await stateConnector.totalBuffers()).toNumber();
    let N0 = 2;
    let CHECK_COUNT = 1000;
    let cnt = 2;
    // 137229 //
    for (let N = N0; N < CHECK_COUNT; N++) {
      let roundId = totalBuffers - N; //currentBufferNumber - N;
      const resp = await axios.get(`https://attestation.flare.network/attester-api/proof/votes-for-round/${roundId}`);
      // console.log(`roundId: ${roundId}`)
      // console.log(response.data.data)
      let data = resp.data.data;
      if (data.length === 0) {
        console.log(`No attestations in roundId ${roundId}`);
        // return;
        continue;
      }
      let hashes: string[] = data.map(item => item.hash) as string[]
      const tree = new MerkleTree(hashes);

      let stateConnectorMerkleRoot = await stateConnector.merkleRoots((roundId + 2) % TOTAL_STORED_PROOFS);

      console.log(`${cnt}\t${roundId}\t${data.length}\t${stateConnectorMerkleRoot === tree.root ? "OK" : "MISMATCH"}`)
      cnt++;
      // console.log(`Number of attestations ${data.length}`)
      // console.log(tree.root);
      // console.log(await stateConnector.merkleRoots((roundId + 2) % TOTAL_STORED_PROOFS))
      // console.log(`Total buffers ${totalBuffers}`)
      // assert(stateConnectorMerkleRoot === tree.root, "Merkle roots do not match. Check if attestation provider works well.");
    }
    // let chosenRequest = data[7];
    // console.log(chosenRequest);
    // let chosenHash = chosenRequest.hash;
    // let index = tree.sortedHashes.findIndex(hash => hash === chosenHash);
    // let response = chosenRequest.response;
    // response.stateConnectorRound = roundId + 2;
    // response.merkleProof = tree.getProof(index);
    // let responseHex = hexlifyBN(response);
    // console.log(responseHex)
    // switch (chosenRequest.request.attestationType) {
    //   case AttestationType.Payment:
    //     assert(await attestationClient.verifyPayment(chosenRequest.request.sourceId, responseHex));
    //     break;
    //   case AttestationType.BalanceDecreasingTransaction:
    //     assert(await attestationClient.verifyBalanceDecreasingTransaction(chosenRequest.request.sourceId, responseHex));
    //     break;
    //   case AttestationType.ConfirmedBlockHeightExists:
    //     assert(await attestationClient.verifyConfirmedBlockHeightExists(chosenRequest.request.sourceId, responseHex));
    //     break;
    //   case AttestationType.ReferencedPaymentNonexistence:
    //     assert(await attestationClient.verifyReferencedPaymentNonexistence(chosenRequest.request.sourceId, responseHex));
    //     break;
    //   default:
    //     throw new Error("Wrong attestation type");
    // }



    //  .response.merkleProof = tree.getProof(index);


    // in case of failure, check this: https://coston-explorer.flare.network/address/0x3a6E101103eC3D9267d08f484a6b70e1440A8255/transactions
  });

  it.skip("Specific request check", async () => {
    let request = '0x000100000000000b213d000028176f73413b56cb5fef35dfe61c67652f486d6a8d67bc2ae06775fcfb9b6e29000000000000000000034eaac138d6a4472cf5ef0080d26fceb73d03f2cc99bf';

    let parsed = parseRequest(request);
    // console.log(parsed)
    // let roundId = currentBufferNumber - 2;
    let roundId = 137860;
    let att = createTestAttestationFromRequest(parsed, roundId, 6)
    let result = await verifyAttestation(client, att, indexedQueryManager);

    console.log(result.status)
    console.log(result.response.blockNumber.toString())
    console.log(await indexedQueryManager.getLastConfirmedBlockNumber())
  })


  it.skip("Test specific round Merkle proofs", async () => {
    let roundId = 161166
    const resp = await axios.get(`https://attestation.flare.network/attester-api/proof/votes-for-round/${roundId}`);
    let data = resp.data.data;
    if (data.length === 0) {
      console.log(`No attestations in roundId ${roundId}`);
      return;
    }
    let hashes: string[] = data.map(item => item.hash) as string[]
    const tree = new MerkleTree(hashes);

    for (let i = 0; i < data.length; i++) {
      let chosenRequest = data[i];      
      let chosenHash = chosenRequest.hash;
      let index = tree.sortedHashes.findIndex(hash => hash === chosenHash);
      let response = chosenRequest.response;
      response.stateConnectorRound = roundId + 2;
      response.merkleProof = tree.getProof(index);
      let responseHex = hexlifyBN(response);
      // console.log(response)
      // console.log(responseHex)
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

  })

});
