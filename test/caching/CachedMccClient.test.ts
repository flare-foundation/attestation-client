import { ChainType, traceManager } from "@flarenetwork/mcc";
import { expect } from "chai";
import { CachedMccClient } from "../../lib/caching/CachedMccClient";
import { MockMccClient } from "../../lib/caching/test-utils/MockMccClient";
import { sleepms } from "../../lib/utils/utils";
import { SourceId } from "../../lib/verification/sources/sources";

const CHAIN_ID = SourceId.BTC;

describe("Cached MCC Client test", function () {
   let mockMccClient: MockMccClient;
   beforeEach(async () => {
      mockMccClient = new MockMccClient();
   });

   it("Mcc Client Mock returns a transaction", async function () {
      let randomTxId = mockMccClient.randomHash32();
      let result = await mockMccClient.getTransaction(randomTxId);
      expect(result.txid.length, "Wrong txId").to.equal(64);
   });

   it("Mcc Client Mock returns a block", async function () {
      let randomBlockHash = mockMccClient.randomHash32(true);
      let result = await mockMccClient.getBlock(randomBlockHash);
      expect(result.blockHash.length).to.equal(64);
      expect(result.blockHash).to.equal(randomBlockHash)
      expect(result.number).to.be.greaterThan(0);
      let randomNumber = mockMccClient.randomBlockNumber();
      result = await mockMccClient.getBlock(randomNumber);
      expect(result.number).to.equal(randomNumber);
      expect(result.blockHash?.length).to.equal(64);
   });

   it("Correct client initialization", async function () {
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, undefined);
      expect(cachedMccClient.client).not.to.be.undefined;
   });

   it("Transaction is cached", async function () {
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, undefined, mockMccClient);
      let randomTxId = mockMccClient.randomHash32(true);
      let result = await cachedMccClient.getTransaction(randomTxId);
      expect(cachedMccClient.transactionCache.get(randomTxId)).not.to.be.undefined;
      expect(cachedMccClient.transactionCleanupQueue.size).to.equal(1);
      expect(randomTxId).to.equal(cachedMccClient.transactionCleanupQueue.first);
   });

   it("Transaction not recorded twice", async function () {
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, undefined, mockMccClient);
      let randomTxId = mockMccClient.randomHash32(true);
      await cachedMccClient.getTransaction(randomTxId);
      await cachedMccClient.getTransaction(randomTxId);
      expect(cachedMccClient.transactionCleanupQueue.size).to.equal(1);
   });

   it("Transaction cache is properly cleaned", async function () {
      let LIMIT = 100;
      let BATCH_SIZE = 10;
      let cachedMccClientOptions = {
         transactionCacheSize: LIMIT,
         blockCacheSize: LIMIT,
         cleanupChunkSize: BATCH_SIZE,
         activeLimit: 50,
         clientConfig: {} as any,
      };
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, cachedMccClientOptions, mockMccClient);

      for (let i = 0; i < LIMIT; i++) {
         let randomTxId = mockMccClient.randomHash32(true);
         await cachedMccClient.getTransaction(randomTxId);
         expect(cachedMccClient.cleanupCheckCounter).to.equal((i + 1) % BATCH_SIZE)
      }
      expect(cachedMccClient.transactionCleanupQueue.size).to.equal(LIMIT);
      for (let i = 0; i < BATCH_SIZE; i++) {
         let randomTxId = mockMccClient.randomHash32(true);
         await cachedMccClient.getTransaction(randomTxId);
      }
      expect(cachedMccClient.cleanupCheckCounter).to.equal(0);
      let first = cachedMccClient.transactionCleanupQueue.first;
      // allow for async cleanup
      expect(cachedMccClient.transactionCache.get(first)).not.to.be.undefined;
      await (sleepms(10));
      expect(cachedMccClient.transactionCleanupQueue.size).to.equal(LIMIT);
      expect(cachedMccClient.transactionCache.get(first)).to.be.undefined;

   });

   it("Block is cached", async function () {
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, undefined, mockMccClient);
      let randomBlockHash = mockMccClient.randomHash32(true);
      await cachedMccClient.getBlock(randomBlockHash);
      expect(cachedMccClient.blockCache.get(randomBlockHash)).not.to.be.undefined;
      expect(cachedMccClient.blockCleanupQueue.size).to.equal(1);
      expect(randomBlockHash).to.equal(cachedMccClient.blockCleanupQueue.first);
      expect(await cachedMccClient.getBlockFromCache(randomBlockHash)).not.to.be.undefined;
   });

   it("Block not recorded twice", async function () {
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, undefined, mockMccClient);
      let randomBlockHash = mockMccClient.randomHash32(true);
      await cachedMccClient.getBlock(randomBlockHash);
      await cachedMccClient.getBlock(randomBlockHash);
      expect(cachedMccClient.blockCleanupQueue.size).to.equal(1);
   });

   it("Block cache is properly cleaned", async function () {
      let LIMIT = 100;
      let BATCH_SIZE = 10;
      let cachedMccClientOptions = {
         transactionCacheSize: LIMIT,
         blockCacheSize: LIMIT,
         cleanupChunkSize: BATCH_SIZE,
         activeLimit: 50,
         clientConfig: {} as any,
      };
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, cachedMccClientOptions, mockMccClient);

      for (let i = 0; i < LIMIT; i++) {
         let randomBlockHash = mockMccClient.randomHash32(true);
         await cachedMccClient.getBlock(randomBlockHash);
         expect(cachedMccClient.cleanupCheckCounter).to.equal((i + 1) % BATCH_SIZE)
      }
      expect(cachedMccClient.blockCleanupQueue.size).to.equal(LIMIT);
      for (let i = 0; i < BATCH_SIZE; i++) {
         let randomBlockHash = mockMccClient.randomHash32(true);
         await cachedMccClient.getBlock(randomBlockHash);
      }
      expect(cachedMccClient.cleanupCheckCounter).to.equal(0);
      let first = cachedMccClient.blockCleanupQueue.first;
      // allow for async cleanup
      expect(cachedMccClient.blockCache.get(first)).not.to.be.undefined;
      await (sleepms(10));
      expect(cachedMccClient.blockCleanupQueue.size).to.equal(LIMIT);
      expect(cachedMccClient.blockCache.get(first)).to.be.undefined;
   });

   // Exits application, so it is hard to test
   it.skip("Get null on wrong transaction id", async function () {
      traceManager.displayStateOnException = false;
      let cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, undefined, mockMccClient);
      try {
         await cachedMccClient.getTransaction("");
      } catch(e: any) {
         console.log("aaaaaa", e)
      }
   });


});
