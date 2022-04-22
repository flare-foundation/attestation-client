// Make a tunell to database:
// ssh -N -L 3337:127.0.0.1:3306 ubuntu@34.89.247.51
// Run the test
// SOURCE_ID=ALGO CONFIG_PATH=dev NODE_ENV=development yarn hardhat test test/CostonVerification.test.ts --network coston

import { ChainType, MCC, MccClient } from "flare-mcc";
import { AttesterClientConfiguration, AttesterCredentials } from "../lib/attester/AttesterClientConfiguration";
import { ChainConfiguration, ChainsConfiguration } from "../lib/chain/ChainConfiguration";
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
import { getSourceName, SourceId } from "../lib/verification/sources/sources";
import { verifyAttestation } from "../lib/verification/verifiers/verifier_routing";
import { AttestationClientSCInstance, StateConnectorInstance } from "../typechain-truffle";

const SOURCE_ID = SourceId[process.env.SOURCE_ID] ?? SourceId.XRP;

const axios = require('axios');

describe(`Coston verification test (${SourceId[SOURCE_ID]})`, () => {
  let currentBufferNumber = 0;
  let BUFFER_TIMESTAMP_OFFSET: number;
  let BUFFER_WINDOW: number;
  let TOTAL_STORED_PROOFS: number;
  let stateConnector: StateConnectorInstance;
  let client: MccClient;
  let indexedQueryManager: IndexedQueryManager;
  let attestationClient: AttestationClientSCInstance;
  let chainName: string;
  let chainIndexerConfig: ChainConfiguration;

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
    chainName = SourceId[SOURCE_ID];
    let configIndexer = readConfig(new ChainsConfiguration(), "chains");
    chainIndexerConfig = configIndexer.chains.find(item => item.name === chainName)
    console.log(chainIndexerConfig)
    // let configAttestationClient = readConfig(new AttesterClientConfiguration(), "attester");
    let attesterCredentials = readCredentials(new AttesterCredentials(), "attester");

    client = MCC.Client(SOURCE_ID, {
      ...chainIndexerConfig.mccCreate,
      rateLimitOptions: chainIndexerConfig.rateLimitOptions
    });

    // console.log(attesterCredentials.indexerDatabase)
    const options: IndexedQueryManagerOptions = {
      chainType: SOURCE_ID as ChainType,
      numberOfConfirmations: () => { return chainIndexerConfig.numberOfConfirmations; },
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

  it("Specific request check", async () => {
    let request = '0x0001000000042caeb87690c1435eaf1a17ff1fe6fbbedc36485dcf532fc31c469d7ea118dfb000639a9b9c1b51a1fc86389b79c3b98fd982fd7b6a82a7a06fe55f41113098690000';
    let roundId = 161628;
    let recheck = true;

    let parsed = parseRequest(request);
    // console.log(parsed)
    // let roundId = currentBufferNumber - 2;

    let att = createTestAttestationFromRequest(parsed, roundId, chainIndexerConfig.numberOfConfirmations)
    let result = await verifyAttestation(client, att, indexedQueryManager, recheck);

    console.log(`Status ${result.status}`)
    console.log(`Block number: ${result.response?.blockNumber?.toString()}`)
    let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    console.log(`Last confirmed block: ${lastConfirmedBlock}`);
  })

  it.only("Specific parsed request check", async () => {
    let roundId = 161893;
    let recheck = true;

    let parsed = {
      "attestationType": 1,
      "sourceId": 4,
      "upperBoundProof": "0xee071caa35d797b46210379dda87c7a970d5d6506443a39a77ffe945cac5d5fc",
      "id": "0xa87d28432412aa98970ad258974820b029ddf81e8fd517f760728978f1aa9efe",
      "inUtxo": "0x0",
      "utxo": "0x0"
    }


    let att = createTestAttestationFromRequest(parsed, roundId, chainIndexerConfig.numberOfConfirmations)
    let result = await verifyAttestation(client, att, indexedQueryManager, recheck);

    console.log(hexlifyBN(result))
    console.log(`Status ${result.status}`)
    console.log(`Block number: ${result.response?.blockNumber?.toString()}`)
    let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    console.log(`Last confirmed block: ${lastConfirmedBlock}`);
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
