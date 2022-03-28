// CONFIG_PATH=dev NODE_ENV=development yarn hardhat test test/CostonVerification.test.ts --network coston

import { ChainType, MCC, MccClient } from "flare-mcc";
import { stat } from "fs";
import { AttestationRoundManager } from "../lib/attester/AttestationRoundManager";
import { AttesterClientConfiguration, AttesterCredentials } from "../lib/attester/AttesterClientConfiguration";
import { IndexedQueryManagerOptions } from "../lib/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../lib/indexed-query-manager/IndexedQueryManager";
import { createTestAttestationFromRequest } from "../lib/indexed-query-manager/random-attestation-requests/random-ar";
import { IndexerConfiguration } from "../lib/indexer/IndexerConfiguration";
import { readConfig, readCredentials } from "../lib/utils/config";
import { DatabaseService } from "../lib/utils/databaseService";
import { getGlobalLogger } from "../lib/utils/logger";
import { MerkleTree } from "../lib/utils/MerkleTree";
import { getUnixEpochTimestamp } from "../lib/utils/utils";
import { parseRequest } from "../lib/verification/generated/attestation-request-parse";
import { verifyAttestation } from "../lib/verification/verifiers/verifier_routing";
import { StateConnectorInstance } from "../typechain-truffle";

const axios = require('axios');

describe("Coston verification test", () => {
  let currentBufferNumber = 0;
  let BUFFER_TIMESTAMP_OFFSET: number;
  let BUFFER_WINDOW: number;
  let TOTAL_STORED_PROOFS: number;
  let stateConnector: StateConnectorInstance;
  let client: MccClient;
  let indexedQueryManager: IndexedQueryManager;

  const StateConnector = artifacts.require("StateConnector");
  before(async () => {
    stateConnector = await StateConnector.at("0x947c76694491d3fD67a73688003c4d36C8780A97");
    BUFFER_TIMESTAMP_OFFSET = (await stateConnector.BUFFER_TIMESTAMP_OFFSET()).toNumber();
    BUFFER_WINDOW = (await stateConnector.BUFFER_WINDOW()).toNumber();
    TOTAL_STORED_PROOFS = (await stateConnector.TOTAL_STORED_PROOFS()).toNumber();
    let now = getUnixEpochTimestamp();
    currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
    console.log(`Current buffer number ${currentBufferNumber}, mod: ${currentBufferNumber % TOTAL_STORED_PROOFS}`)

    let configIndexer = readConfig<IndexerConfiguration>("indexer");
    let chainIndexerConfig = configIndexer.chains.find(item => item.name === 'BTC')
    let configAttestationClient = readConfig<AttesterClientConfiguration>("attester");
    let attesterCredentials = readCredentials<AttesterCredentials>("attester");

    client = MCC.Client(ChainType.BTC, {
      ...chainIndexerConfig.mccCreate,
      rateLimitOptions: chainIndexerConfig.rateLimitOptions
    });

    // const DAC = new AttestationRoundManager(null, configAttestationClient, attesterCredentials, getGlobalLogger(), null);
    // DAC.initialize();
console.log(attesterCredentials.indexerDatabase)
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
    let N = 3;
    // 137229 //
    let roundId = totalBuffers - N; //currentBufferNumber - N;
    const response = await axios.get(`http://34.89.247.51/attester-api/proof/votes-for-round/${roundId}`);
    console.log(`roundId: ${roundId}`)
    // console.log(response.data.data)
    let data = response.data.data;
    if(data.length === 0) {
      console.log(`No attesations in roundId ${roundId}`);
      return;
    }
    let hashes: string[] = data.map(item => item.hash) as string[]
    const tree = new MerkleTree(hashes);

    let stateConnectorMerkleRoot = await stateConnector.merkleRoots((roundId + 2) % TOTAL_STORED_PROOFS);
    

    console.log(`Number of attestations ${data.length}`)
    console.log(tree.root);
    console.log(await stateConnector.merkleRoots((roundId + 2) % TOTAL_STORED_PROOFS))
    console.log(`Total buffers ${totalBuffers}`)
    assert(stateConnectorMerkleRoot === tree.root,"Merkle roots do not match. Check if attestation provider works well.");
    // in case of failure, check this: https://coston-explorer.flare.network/address/0x3a6E101103eC3D9267d08f484a6b70e1440A8255/transactions
  });

  // it("Specific request check", async () => {
  //   let request = '0x000200000000000b20b900de7774052f50c65aa3c173a00ed7308513750b57f27077ffb8c5f3c9ad5df5f900000000000000000005dc665ce8346580d5e52f0b4a2f3e822fcd574c10154f';

  //   let parsed = parseRequest(request);
  //   // console.log(parsed)

  //   let att = createTestAttestationFromRequest(parsed, currentBufferNumber - 2, 6)
  //   let result = await verifyAttestation(client, att, indexedQueryManager);

  //   console.log(result.status)
  //   console.log(result.response.blockNumber.toString())
  //   console.log(await indexedQueryManager.getLastConfirmedBlockNumber())
  // })


});
