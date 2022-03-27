import { getUnixEpochTimestamp } from "../lib/utils/utils";
import fetch from 'node-fetch';
import { MerkleTree } from "../lib/utils/MerkleTree";
import { StateConnectorInstance } from "../typechain-truffle";
import { parseRequest } from "../lib/verification/generated/attestation-request-parse";
import { verifyAttestation } from "../lib/verification/verifiers/verifier_routing";
import { ChainType, MCC, MccClient } from "flare-mcc";
import { readConfig, readCredentials } from "../lib/utils/config";
import { IndexerConfiguration } from "../lib/indexer/IndexerConfiguration";
import { cli } from "winston/lib/winston/config";
import { IndexedQueryManagerOptions } from "../lib/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../lib/indexed-query-manager/IndexedQueryManager";
import { createTestAttestationFromRequest } from "../lib/indexed-query-manager/random-attestation-requests/random-ar";
import { AttestationRoundManager } from "../lib/attester/AttestationRoundManager";
import { getGlobalLogger } from "../lib/utils/logger";
import { AttesterClientConfiguration, AttesterCredentials } from "../lib/attester/AttesterClientConfiguration";

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

    const DAC = new AttestationRoundManager(null, configAttestationClient, attesterCredentials, getGlobalLogger(), null);
    DAC.initialize();

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.BTC,
      numberOfConfirmations: () => { return 6; },
      maxValidIndexerDelaySec: 10,
      windowStartTime: (roundId: number) => {
        // todo: read this from DAC
        const queryWindowInSec = 86400;
        return BUFFER_TIMESTAMP_OFFSET + roundId * BUFFER_WINDOW - queryWindowInSec;
      }
    } as IndexedQueryManagerOptions;
    indexedQueryManager = new IndexedQueryManager(options);
    await indexedQueryManager.dbService.waitForDBConnection()

  });

  it("Should calculate current buffer number", async () => {
    let roundId = (n: number) => (currentBufferNumber - n) % TOTAL_STORED_PROOFS;

    let N = 2;
    const response = await axios.get(`http://34.89.247.51/attester-api/proof/votes-for-round/${roundId(N)}`);
    console.log(response.data.data)
    // let data = response.data.data;
    // let hashes: string[] = data.map(item => item.hash) as string[]
    // const tree = new MerkleTree(hashes);
    // console.log(data.length, tree.root);

    // console.log(await stateConnector.merkleRoots(roundId(N)))



  });

  it.only("Fancy request", async () => {
    let request = '0x000200000000000b20af000df7f038b1f6b61e34cd60abc75d50e1b55ccd8b0f00a6a45f0cfbee639a8fc2000000000000000000071cb9fb9b720cffbabcd8b6438009607577c90e05f0d5';

    let parsed = parseRequest(request);
    // console.log(parsed)

    let att = createTestAttestationFromRequest(parsed, currentBufferNumber - 2, 6)
    let result = await verifyAttestation(client, att, indexedQueryManager);

    console.log(result)

  })


});
