// Run tests with the following command lines:
// Make sure that you are connected to a synced database and indexers are running
// Set correct configurations for `dev`
//  SOURCE_ID=BTC CONFIG_PATH=dev NODE_ENV=development yarn hardhat test test/verification/verification.test.ts

import { ChainType, MCC, MccClient } from "flare-mcc";
import { AttesterClientChain } from "../../lib/attester/AttesterClientChain";
import { AttesterClientConfiguration, AttesterCredentials } from "../../lib/attester/AttesterClientConfiguration";
import { DBBlockBase } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBase } from "../../lib/entity/indexer/dbTransaction";
import { IndexedQueryManagerOptions } from "../../lib/indexed-query-manager/indexed-query-manager-types";
import { RandomDBIterator } from "../../lib/indexed-query-manager/indexed-query-manager-utils";
import { IndexedQueryManager } from "../../lib/indexed-query-manager/IndexedQueryManager";
import { createTestAttestationFromRequest, prepareRandomGenerators, TxOrBlockGeneratorType } from "../../lib/indexed-query-manager/random-attestation-requests/random-ar";
import { prepareRandomizedRequestPayment } from "../../lib/indexed-query-manager/random-attestation-requests/random-ar-00001-payment";
import { prepareRandomizedRequestBalanceDecreasingTransaction } from "../../lib/indexed-query-manager/random-attestation-requests/random-ar-00002-balance-decreasing-transaction";
import { prepareRandomizedRequestConfirmedBlockHeightExists } from "../../lib/indexed-query-manager/random-attestation-requests/random-ar-00003-confirmed-block-height-exists";
import { prepareRandomizedRequestReferencedPaymentNonexistence } from "../../lib/indexed-query-manager/random-attestation-requests/random-ar-00004-referenced-payment-nonexistence";
import { IndexerClientChain, IndexerConfiguration } from "../../lib/indexer/IndexerConfiguration";
import { readConfig, readCredentials } from "../../lib/utils/config";
import { DatabaseService } from "../../lib/utils/databaseService";
import { DotEnvExt } from "../../lib/utils/DotEnvExt";
import { getGlobalLogger } from "../../lib/utils/logger";
import { getUnixEpochTimestamp } from "../../lib/utils/utils";
import { VerificationStatus } from "../../lib/verification/attestation-types/attestation-types";
import { getSourceName, SourceId } from "../../lib/verification/sources/sources";
import { verifyAttestation } from "../../lib/verification/verifiers/verifier_routing";

const SOURCE_ID = SourceId[process.env.SOURCE_ID] ?? SourceId.XRP;
const ROUND_ID = 1;
const MINUTES = 60;
const BATCH_SIZE = 100;
const TOP_UP_THRESHOLD = 0.25;
const HISTORY_WINDOW = 5 * MINUTES;
let NUMBER_OF_CONFIRMATIONS = 6

console.warn(`This test should run while ${getSourceName(SOURCE_ID)} indexer is running`)
// Overriding .env variables for this particular test only
console.warn(`Overriding DOTENV=DEV, NODE_ENV=development`);
process.env.DOTENV = "DEV";
process.env.NODE_ENV = "development";
DotEnvExt();

describe(`${getSourceName(SOURCE_ID)} verifiers`, () => {
   let indexedQueryManager: IndexedQueryManager;
   let client: MccClient;
   let indexerConfiguration: IndexerConfiguration;
   let attesterClientConfiguration: AttesterClientConfiguration;
   let chainName: string;
   let startTime = 0;
   let randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>;


   before(async () => {
      // indexerConfiguration = indexerConfig as IndexerConfiguration
      // attesterClientConfiguration = configAttestationClient as AttesterClientConfiguration;

      indexerConfiguration = readConfig<IndexerConfiguration>("indexer");
      attesterClientConfiguration = readConfig<AttesterClientConfiguration>("attester");
      const attesterCredentials = readCredentials<AttesterCredentials>("attester");

      chainName = getSourceName(SOURCE_ID);
      let indexerChainConfiguration = indexerConfiguration.chains.find(chain => chain.name === chainName) as IndexerClientChain;
      client = MCC.Client(SOURCE_ID, {
         ...indexerChainConfiguration.mccCreate,
         rateLimitOptions: indexerChainConfiguration.rateLimitOptions
      });
      //  startTime = Math.floor(Date.now()/1000) - HISTORY_WINDOW;

      let attesterClientChainConfiguration = attesterClientConfiguration.chains.find(chain => chain.name === chainName) as AttesterClientChain;

      //NUMBER_OF_CONFIRMATIONS = attesterClientChainConfiguration.numberOfConfirmations;

      const options: IndexedQueryManagerOptions = {
         chainType: SOURCE_ID as any as ChainType,
         numberOfConfirmations: () => { return indexerChainConfiguration.numberOfConfirmations; },
         dbService: new DatabaseService(getGlobalLogger(), attesterCredentials.indexerDatabase, "indexer"),
         maxValidIndexerDelaySec: attesterClientChainConfiguration.maxValidIndexerDelaySec,
         // todo: return epochStartTime - query window length, add query window length into DAC
         windowStartTime: (roundId: number) => { return startTime; }
      } as IndexedQueryManagerOptions;
      indexedQueryManager = new IndexedQueryManager(options);
      await indexedQueryManager.dbService.waitForDBConnection();
      randomGenerators = await prepareRandomGenerators(indexedQueryManager, BATCH_SIZE, TOP_UP_THRESHOLD);
   });

   it("Should verify legit Payment", async () => {
      let randomTransaction = await randomGenerators.get(TxOrBlockGeneratorType.TxNativePayment).next();
      if (!randomTransaction) {
         return;
      }

      let request = await prepareRandomizedRequestPayment(
         indexedQueryManager,
         randomTransaction as DBTransactionBase,
         SOURCE_ID,
         ROUND_ID,
         NUMBER_OF_CONFIRMATIONS,
         "CORRECT"
      );

      // console.log(randomTransaction.isNativePayment)
      let attestation = createTestAttestationFromRequest(request, ROUND_ID, NUMBER_OF_CONFIRMATIONS);

      let res = await verifyAttestation(client, attestation, indexedQueryManager);
      assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);
      // console.log(res); 
      // console.log(res.response.spentAmount.toString(), res.response.receivedAmount.toString())

   });

   it("Should verify legit BalanceDecreasingTransaction", async () => {
      let randomTransaction = await randomGenerators.get(TxOrBlockGeneratorType.TxGeneral).next();
      if (!randomTransaction) {
         return;
      }

      let request = await prepareRandomizedRequestBalanceDecreasingTransaction(
         indexedQueryManager,
         randomTransaction as DBTransactionBase,
         SOURCE_ID,
         ROUND_ID,
         NUMBER_OF_CONFIRMATIONS,
         "CORRECT"
      );

      // console.log(randomTransaction, request);
      // console.log(randomTransaction.isNativePayment)
      let attestation = createTestAttestationFromRequest(request, ROUND_ID, NUMBER_OF_CONFIRMATIONS);

      let res = await verifyAttestation(client, attestation, indexedQueryManager);
      // console.log(res); 

      assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);
      // console.log(res.response.spentAmount.toString(), res.response.receivedAmount.toString())

   });

   it("Should verify legit ConfirmedBlockHeightExists", async () => {
      let lastBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();

      let blockQueryRequest = await indexedQueryManager.queryBlock({
         blockNumber: lastBlockNumber - 2,
         roundId: ROUND_ID,
         confirmed: true
      })

      let request = await prepareRandomizedRequestConfirmedBlockHeightExists(
         indexedQueryManager,
         blockQueryRequest.result,
         SOURCE_ID,
         ROUND_ID,
         NUMBER_OF_CONFIRMATIONS,
         "CORRECT"
      );

      // console.log(request);
      // console.log(randomTransaction.isNativePayment)
      let attestation = createTestAttestationFromRequest(request, ROUND_ID, NUMBER_OF_CONFIRMATIONS);

      let res = await verifyAttestation(client, attestation, indexedQueryManager);
      // console.log(res); 
      assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);

      // console.log(res.response.spentAmount.toString(), res.response.receivedAmount.toString())

   });

   it("Should verify legit ReferencedPaymentNonexistence", async () => {
      let N = await indexedQueryManager.getLastConfirmedBlockNumber();
      let maxReps = 10;
      while (maxReps > 0) {
         maxReps--;
         let randomTransaction = await randomGenerators.get(TxOrBlockGeneratorType.TxNativeReferencedPayment).next();

         if (!randomTransaction) {
            if(maxReps > 0) {
               continue;
            }
            console.log("Cannot find the case - transaction")
            return;
         }

         // console.log("block", randomTransaction.blockNumber, N, (randomTransaction as DBTransactionBase).transactionId, )
         let request = await prepareRandomizedRequestReferencedPaymentNonexistence(
            indexedQueryManager,
            randomTransaction as DBTransactionBase,
            SOURCE_ID,
            ROUND_ID,
            NUMBER_OF_CONFIRMATIONS,
            "CORRECT"
         );

         if (!request) {
            if(maxReps > 0) {
               continue;
            }
            console.log("Cannot find the case - request")
            return;
         }

         // console.log(randomTransaction.isNativePayment)
         let attestation = createTestAttestationFromRequest(request, ROUND_ID, NUMBER_OF_CONFIRMATIONS);

         let res = await verifyAttestation(client, attestation, indexedQueryManager);
         assert(res.status === VerificationStatus.OK, `Wrong status: ${res.status}`);
         break;
         // console.log(res); 
         // console.log(res.response.spentAmount.toString(), res.response.receivedAmount.toString())
      }
      assert(maxReps > 0, "Too many tries")
   });


   it("Should be IndexedQueryManager in sync", async () => {
      let N = await indexedQueryManager.getLastConfirmedBlockNumber();
      let res = await indexedQueryManager.getBlockHeightSample();
      let now = await getUnixEpochTimestamp();
      let delay = now - res.timestamp;
      assert(delay < indexedQueryManager.settings.maxValidIndexerDelaySec, `Delay too big: ${delay}, N = ${N}, T = ${res.height}, h = ${res.height - N}`);
   })
   // it("Example of tecUNFUNDED_PAYMENT transaction", async () => {
   //    let txid = "D0AB7DB06EC0D8D0E71A162C8C81ABB6A5C67398BB115F2544D0BA80DA69A96E";
   //    console.log(txid.length)
   //    let endBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
   //    let txs = await indexedQueryManager.queryTransactions({
   //       transactionId: txid,
   //       roundId: ROUND_ID,
   //       endBlock
   //    });
   //    let tx = txs[0];
   //    console.log(tx)
   //    console.log(JSON.stringify(JSON.parse(tx.response), null, 3));    
   // });


});


// Long payment reference: 0x67390C4BE3210DE207747058499FAFA3E9219E7B7F14E7AE07E033A01E2FC8F