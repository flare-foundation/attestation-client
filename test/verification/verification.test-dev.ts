// Run tests with the following command lines.
// Make sure that you are connected to a synced database and indexers are running
// Set correct configurations for `dev`
//  SOURCE_ID=BTC CONFIG_PATH=dev NODE_ENV=development yarn hardhat test test/verification/verification.test.ts
//  SOURCE_ID=ALGO CONFIG_PATH=dev NODE_ENV=development yarn hardhat test test/verification/verification.test.ts

import { ChainType, MCC, MccClient } from "@flarenetwork/mcc";
import assert from "assert";
import { DBBlockBase } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBase } from "../../src/entity/indexer/dbTransaction";
import { IndexedQueryManagerOptions } from "../../src/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../src/indexed-query-manager/IndexedQueryManager";
import {
  createTestAttestationFromRequest,
  prepareRandomGenerators,
  TxOrBlockGeneratorType
} from "../../src/indexed-query-manager/random-attestation-requests/random-ar";
import { prepareRandomizedRequestPayment } from "../../src/indexed-query-manager/random-attestation-requests/random-ar-00001-payment";
import { prepareRandomizedRequestBalanceDecreasingTransaction } from "../../src/indexed-query-manager/random-attestation-requests/random-ar-00002-balance-decreasing-transaction";
import { prepareRandomizedRequestConfirmedBlockHeightExists } from "../../src/indexed-query-manager/random-attestation-requests/random-ar-00003-confirmed-block-height-exists";
import { prepareRandomizedRequestReferencedPaymentNonexistence } from "../../src/indexed-query-manager/random-attestation-requests/random-ar-00004-referenced-payment-nonexistence";
import { RandomDBIterator } from "../../src/indexed-query-manager/random-attestation-requests/random-query";
import { VerifierServerConfig } from "../../src/servers/verifier-server/src/config-models/VerifierServerConfig";
import { ChainConfig, ListChainConfig } from "../../src/source/ChainConfig";
import { readSecureConfig } from "../../src/utils/configSecure";
import { DatabaseService } from "../../src/utils/databaseService";
import { getGlobalLogger } from "../../src/utils/logger";
import { getUnixEpochTimestamp } from "../../src/utils/utils";
import { VerificationStatus } from "../../src/verification/attestation-types/attestation-types";
import { getSourceName, SourceId } from "../../src/verification/sources/sources";
import { verifyAttestation } from "../../src/verification/verifiers/verifier_routing";

const SOURCE_ID = SourceId[process.env.SOURCE_ID] ?? SourceId.XRP;
const ROUND_ID = 1;
const BATCH_SIZE = 100;
const TOP_UP_THRESHOLD = 0.25;

console.warn(`This test should run while ${getSourceName(SOURCE_ID)} indexer is running`);
// Overriding .env variables for this particular test only
console.warn(`Overriding DOTENV=DEV, NODE_ENV=development`);
process.env.DOTENV = "DEV";
process.env.NODE_ENV = "development";

describe(`${getSourceName(SOURCE_ID)} verifiers`, () => {
  let indexedQueryManager: IndexedQueryManager;
  let client: MccClient;
  let chainsConfiguration: ListChainConfig;
  let chainName: string;
  const startTime = 0;
  const cutoffTime = 0; // TODO - set properly

  let randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>;

  before(async () => {
    chainsConfiguration = await readSecureConfig(new ListChainConfig(), "chains");
    const verifierCredentials = await readSecureConfig(new VerifierServerConfig(), `${SOURCE_ID.toLowerCase()}-verifier`);

    chainName = getSourceName(SOURCE_ID);
    const indexerChainConfiguration = chainsConfiguration.chains.find((chain) => chain.name === chainName) as ChainConfig;
    client = MCC.Client(SOURCE_ID, {
      ...indexerChainConfiguration.mccCreate,
      rateLimitOptions: indexerChainConfiguration.rateLimitOptions,
    });
    //  startTime = Math.floor(Date.now()/1000) - HISTORY_WINDOW;

    const attesterClientChainConfiguration = chainsConfiguration.chains.find((chain) => chain.name === chainName) as ChainConfig;

    //NUMBER_OF_CONFIRMATIONS = attesterClientChainConfiguration.numberOfConfirmations;

    let dbService = (new DatabaseService(getGlobalLogger(), verifierCredentials.indexerDatabase, "indexer"));
    await dbService.connect()
    const options: IndexedQueryManagerOptions = {
      chainType: SOURCE_ID as ChainType,
      numberOfConfirmations: () => {
        return indexerChainConfiguration.numberOfConfirmations;
      },
      // TODO: connect the database
      entityManager: dbService.manager,
      maxValidIndexerDelaySec: attesterClientChainConfiguration.maxValidIndexerDelaySec,
      // todo: return epochStartTime - query window length, add query window length into DAC
    } as IndexedQueryManagerOptions;
    indexedQueryManager = new IndexedQueryManager(options);
    randomGenerators = await prepareRandomGenerators(indexedQueryManager, BATCH_SIZE, TOP_UP_THRESHOLD);
  });

  it("Should verify legit Payment", async () => {
    const randomTransaction = await randomGenerators.get(TxOrBlockGeneratorType.TxNativePayment).next();
    if (!randomTransaction) {
      return;
    }

    const request = await prepareRandomizedRequestPayment(
      indexedQueryManager,
      randomTransaction as DBTransactionBase,
      SOURCE_ID,
      ROUND_ID,
      "CORRECT"
    );

    const attestation = createTestAttestationFromRequest(request, ROUND_ID);

    const res = await verifyAttestation(client, attestation, indexedQueryManager);
    assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);
  });

  it("Should verify legit BalanceDecreasingTransaction", async () => {
    const randomTransaction = await randomGenerators.get(TxOrBlockGeneratorType.TxGeneral).next();
    if (!randomTransaction) {
      return;
    }

    const request = await prepareRandomizedRequestBalanceDecreasingTransaction(
      indexedQueryManager,
      randomTransaction as DBTransactionBase,
      SOURCE_ID,
      ROUND_ID,
      "CORRECT"
    );

    const attestation = createTestAttestationFromRequest(request, ROUND_ID);

    const res = await verifyAttestation(client, attestation, indexedQueryManager);

    assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);
  });

  it("Should verify legit ConfirmedBlockHeightExists", async () => {
    const lastBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();

    const blockQueryRequest = await indexedQueryManager.queryBlock({
      blockNumber: lastBlockNumber - 2,
      confirmed: true,
    });

    const request = await prepareRandomizedRequestConfirmedBlockHeightExists(
      indexedQueryManager,
      blockQueryRequest.result,
      SOURCE_ID,
      ROUND_ID,
      "CORRECT"
    );

    if (!request) {
      console.log("NO REQUEST - Repeat the test", request);
    }
    const attestation = createTestAttestationFromRequest(request, ROUND_ID);

    const res = await verifyAttestation(client, attestation, indexedQueryManager);
    assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);
  });

  it("Should verify legit ReferencedPaymentNonexistence", async () => {
    let maxReps = 10;
    while (maxReps > 0) {
      maxReps--;
      const randomTransaction = await randomGenerators.get(TxOrBlockGeneratorType.TxNativeReferencedPayment).next();

      if (!randomTransaction) {
        if (maxReps > 0) {
          continue;
        }
        console.log("Cannot find the case - transaction");
        return;
      }

      const request = await prepareRandomizedRequestReferencedPaymentNonexistence(
        indexedQueryManager,
        randomTransaction as DBTransactionBase,
        SOURCE_ID,
        ROUND_ID,
        "CORRECT"
      );

      if (!request) {
        if (maxReps > 0) {
          continue;
        }
        console.log("Cannot find the case - request");
        return;
      }

      const attestation = createTestAttestationFromRequest(request, ROUND_ID);

      const res = await verifyAttestation(client, attestation, indexedQueryManager);
      assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);
      // break;
    }
    assert(maxReps > 0, "Too many tries");
  });

  it("Should be IndexedQueryManager in sync", async () => {
    const N = await indexedQueryManager.getLastConfirmedBlockNumber();
    const res = await indexedQueryManager.getLatestBlockTimestamp();
    const now = await getUnixEpochTimestamp();
    const delay = now - res.timestamp;
    assert(delay < indexedQueryManager.settings.maxValidIndexerDelaySec, `Delay too big: ${delay}, N = ${N}, T = ${res.height}, h = ${res.height - N}`);
  });
});
