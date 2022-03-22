import { ChainType, MCC } from "flare-mcc";
import * as indexerConfig from "../configs/config-indexer.json";
import { IndexedQueryManagerOptions } from "../lib/indexed-query-manager/indexed-query-manager-types";
import { getRandomConfirmedBlock, getRandomTransaction, getRandomTransactionWithPaymentReference } from "../lib/indexed-query-manager/indexed-query-manager-utils";
import { IndexedQueryManager } from "../lib/indexed-query-manager/IndexedQueryManager";
import { IndexerConfiguration } from "../lib/indexer/IndexerConfiguration";
import { DotEnvExt } from "../lib/utils/DotEnvExt";
import { getSourceName } from "../lib/verification/sources/sources";

console.log("This test should run while XRP indexer is running")

const CHAIN_ID = ChainType.XRP;
const MINUTES = 60;
const HISTORY_WINDOW = 5 * MINUTES;
const NUMBER_OF_CONFIRMATIONS = 1;

// Overriding .env variables for this particular test only
console.warn(`Overriding DOTENV=DEV, NODE_ENV=development`);
process.env.DOTENV = "DEV";
process.env.NODE_ENV = "development";
DotEnvExt();

describe("Indexed query manager", () => {
   let indexedQueryManager: IndexedQueryManager;
   let client: MCC.XRP;
   let indexerConfiguration: IndexerConfiguration;
   let chainName: string;
   let startTime = 0;


   before(async () => {
      indexerConfiguration = indexerConfig as IndexerConfiguration
      chainName = getSourceName(CHAIN_ID);
      let chainConfiguration = indexerConfig.chains.find(chain => chain.name === chainName);
      client = MCC.Client(CHAIN_ID, {
         ...chainConfiguration.mccCreate,
         rateLimitOptions: chainConfiguration.rateLimitOptions
      }) as MCC.XRP;
      //  startTime = Math.floor(Date.now()/1000) - HISTORY_WINDOW;

      const options: IndexedQueryManagerOptions = {
         chainType: ChainType.XRP,
         numberOfConfirmations: NUMBER_OF_CONFIRMATIONS,
         // todo: return epochStartTime - query window length, add query window length into DAC
         windowStartTime: (epochId: number) => { return startTime; }
      } as IndexedQueryManagerOptions;
      indexedQueryManager = new IndexedQueryManager(options);
      await indexedQueryManager.dbService.waitForDBConnection();
   });

   it("Should get last confirmed block number", async () => {
      let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
      assert(lastConfirmedBlock > 0);
      // console.log(`Last confirmed block ${lastConfirmedBlock}`);

   });

   it("Should get a random confirmed transaction", async () => {
      let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
      let randomTransaction = await getRandomTransaction(indexedQueryManager);
      assert(randomTransaction && randomTransaction.blockNumber && randomTransaction.blockNumber <= lastConfirmedBlock)
   });

   it("Should get two different random transactions with payment reference", async () => {
      let maxReps = 5;
      // Checking for two transactions to verify "randomness"
      while (true) {
         let randomTransaction1 = await getRandomTransactionWithPaymentReference(indexedQueryManager);
         let randomTransaction2 = await getRandomTransactionWithPaymentReference(indexedQueryManager);
         if (!randomTransaction1 || !randomTransaction1) {
            console.log("Probably empty tables of transactions. Run indexer.");
            return;
         }
         assert(randomTransaction1.paymentReference.length > 0);
         assert(randomTransaction2.paymentReference.length > 0);
         if (randomTransaction1.paymentReference === randomTransaction2.paymentReference) {
            maxReps--;
            if (maxReps === 0) {
               console.log("Too little transactions. Random choices repeat too often.");
            }
            continue;
         }
         break;
      }
   });

   it("Should get random native payment transaction with reference", async () => {
      let randomTransaction = await getRandomTransactionWithPaymentReference(indexedQueryManager);
      if (randomTransaction) {
         assert(randomTransaction.isNativePayment, "Not native payment")
         assert(randomTransaction.paymentReference.length > 0, "Should have payment reference");
      }
   })

   it("Should get random non native payment transaction with reference", async () => {
      let randomTransaction = await getRandomTransactionWithPaymentReference(indexedQueryManager, false, true);
      if (randomTransaction) {
         assert(!randomTransaction.isNativePayment, "Should not be native payment")
         // For XRP only
         assert(randomTransaction.paymentReference.length > 0, "Should have payment reference");
      }
   })

   it("Should get a random confirmed block", async () => {
      let maxReps = 5;
      let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
      while (true) {
         let randomBlock1 = await getRandomConfirmedBlock(indexedQueryManager);
         let randomBlock2 = await getRandomConfirmedBlock(indexedQueryManager);
         if (!randomBlock1 || !randomBlock2) {
            console.log("Probably empty table of blocks. Run indexer");
            return;
         }
         assert(randomBlock1.blockNumber <= lastConfirmedBlock, "randomBlock1 above last confirmed block");
         assert(randomBlock2.blockNumber <= lastConfirmedBlock, "randomBlock2 above last confirmed block");
         if (randomBlock1.blockNumber === randomBlock2.blockNumber) {
            maxReps--;
            if (maxReps === 0) {
               console.log("Too little blocks. Random choices repeat too often");
            }
            continue;
         }
      }
   });


   it("Should get the correct block greater or equal to timestamp", async () => {
      startTime = 0;
      let randomBlock = await getRandomConfirmedBlock(indexedQueryManager);
      let timestamp = randomBlock.timestamp - 20;
      let tmpBlock = await indexedQueryManager.getFirstConfirmedBlockAfterTime(timestamp);
      let currentBlockNumber = tmpBlock.blockNumber;
      while (currentBlockNumber < randomBlock.blockNumber) {
         tmpBlock = await indexedQueryManager.queryBlock({ blockNumber: currentBlockNumber, roundId: 0, confirmed: true });
         assert(tmpBlock.timestamp < randomBlock.timestamp);
         currentBlockNumber++;
      }
   });

   it("Should get the correct block overflow block", async () => {
      startTime = 0;
      let randomBlock = await getRandomConfirmedBlock(indexedQueryManager);
      let timestamp = randomBlock.timestamp;
      let tmpBlock = await indexedQueryManager.getFirstConfirmedOverflowBlock(timestamp, randomBlock.blockNumber);
      assert(tmpBlock.blockNumber = randomBlock.blockNumber + 1);
      let tmpBlock2 = await indexedQueryManager.getFirstConfirmedOverflowBlock(timestamp, randomBlock.blockNumber + 2);
      assert(tmpBlock2.blockNumber = randomBlock.blockNumber + 3);

      let targetTime = timestamp + 20;
      let tmpBlock3 = await indexedQueryManager.getFirstConfirmedOverflowBlock(targetTime, randomBlock.blockNumber);
      let currentBlockNumber = randomBlock.blockNumber + 1;
      assert(tmpBlock3.blockNumber > randomBlock.blockNumber && tmpBlock3.timestamp > targetTime);
      let currentBlock = await indexedQueryManager.queryBlock({ blockNumber: currentBlockNumber, roundId: 0, confirmed: true });
      while (currentBlockNumber < tmpBlock3.blockNumber) {
         assert(currentBlock.timestamp <= targetTime);
         currentBlockNumber++;
         currentBlock = await indexedQueryManager.queryBlock({ blockNumber: currentBlockNumber, roundId: 0, confirmed: true });
      }
      assert(currentBlock.blockHash === tmpBlock3.blockHash)
   });


   it("Should query transactions by transaction id", async () => {
      startTime = 0;
      let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
      let randomTransaction = await getRandomTransactionWithPaymentReference(indexedQueryManager);
      if (!randomTransaction) {
         console.log("Probably too little transactions. Run indexer");
      }
      let tmpTransactions = await indexedQueryManager.queryTransactions({
         roundId: 0,
         endBlock: lastConfirmedBlock,
         transactionId: randomTransaction.transactionId
      })
      assert(tmpTransactions.length === 1 && tmpTransactions[0].transactionId === randomTransaction.transactionId);
   });

   it("Should query transactions by payment reference", async () => {
      startTime = 0;
      let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
      let randomTransaction = await getRandomTransactionWithPaymentReference(indexedQueryManager);
      if (!randomTransaction) {
         console.log("Probably too little transactions. Run indexer");
      }
      let tmpTransactions = await indexedQueryManager.queryTransactions({
         roundId: 0,
         endBlock: lastConfirmedBlock,
         transactionId: randomTransaction.transactionId
      })
      console.log(tmpTransactions.length)
      assert(tmpTransactions.length > 0);
      let found = false;
      for (let tmpTransaction of tmpTransactions) {
         if (tmpTransaction.transactionId === randomTransaction.transactionId) {
            found = true;
         }
      }
      assert(found);
   });

   it("Should be able to set last debug confirmed block", async () => {
      let offset = 5;
      indexedQueryManager.setDebugLastConfirmedBlock(undefined);
      let lastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
      indexedQueryManager.setDebugLastConfirmedBlock(lastConfirmedBlockNumber - offset);
      let newLastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
      assert(newLastConfirmedBlockNumber === lastConfirmedBlockNumber - offset);
      indexedQueryManager.setDebugLastConfirmedBlock(undefined);
      newLastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
      assert(newLastConfirmedBlockNumber >= lastConfirmedBlockNumber)
   });


   it("Should confirmed block queries respect start time", async () => {
      startTime = 0;
      let randomConfirmedBlock = await getRandomConfirmedBlock(indexedQueryManager);
      let block = await indexedQueryManager.queryBlock({
         roundId: 1,
         blockNumber: randomConfirmedBlock.blockNumber,
         confirmed: true
      })
      assert(block, "Block is not returned by query");
      startTime = block.timestamp + 1;
      block = await indexedQueryManager.queryBlock({
         roundId: 1,
         blockNumber: randomConfirmedBlock.blockNumber,
         confirmed: true
      })
      assert(!block);
   });

   it("Should confirmed transactions queries respect start time and endBlock number", async () => {
      startTime = 0;
      let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();

      let randomTransaction  = await getRandomTransaction(indexedQueryManager);
      let transactions = await indexedQueryManager.queryTransactions({
         roundId: 1,
         endBlock: lastConfirmedBlock,
         transactionId: randomTransaction.transactionId
      })
      assert(transactions.length === 1, "Transaction is not returned by query");

      let transaction = transactions[0];
      startTime = transaction.timestamp + 1;
      transactions = await indexedQueryManager.queryTransactions({
         roundId: 1,
         endBlock: lastConfirmedBlock,
         transactionId: randomTransaction.transactionId
      })
      assert(transactions.length === 0, "Does not respect start time");
      
      startTime = 0;
      transactions = await indexedQueryManager.queryTransactions({
         roundId: 1,
         endBlock: transaction.blockNumber - 1,
         transactionId: randomTransaction.transactionId
      })
      assert(transactions.length === 0, "Does not respect endBlock");
   });
});
