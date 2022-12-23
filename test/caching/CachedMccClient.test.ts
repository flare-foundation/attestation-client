import { ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import { CachedMccClient } from "../../lib/caching/CachedMccClient";
import { MockMccClient } from "../../lib/caching/test-utils/MockMccClient";
import { initializeTestGlobalLogger } from "../../lib/utils/logger";
import { sleepms } from "../../lib/utils/utils";
import { SourceId } from "../../lib/verification/sources/sources";
import { TestBlockXRPAlt } from "../mockData/indexMock";
import { getTestFile, TERMINATION_TOKEN, testWithoutLoggingTracingAndApplicationTermination } from "../test-utils/test-utils";

const sinon = require("sinon");
const CHAIN_ID = SourceId.XRP;

describe(`Cached MCC Client test XRP (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let mockMccClient: MockMccClient;
  beforeEach(async () => {
    mockMccClient = new MockMccClient();
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Mcc Client Mock returns a transaction", async function () {
    const randomTxId = mockMccClient.randomHash32();
    const result = await mockMccClient.getTransaction(randomTxId);
    expect(result.txid.length, "Wrong txId").to.equal(64);
  });

  it("Mcc Client Mock returns a block", async function () {
    const randomBlockHash = mockMccClient.randomHash32(true);
    let result = await mockMccClient.getBlock(randomBlockHash);
    expect(result.blockHash.length).to.equal(64);
    expect(result.blockHash).to.equal(randomBlockHash);
    expect(result.number).to.be.greaterThan(0);
    const randomNumber = mockMccClient.randomBlockNumber();
    result = await mockMccClient.getBlock(randomNumber);
    expect(result.number).to.equal(randomNumber);
    expect(result.blockHash?.length).to.equal(64);
  });

  it("Correct client initialization", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, undefined);
    expect(cachedMccClient.client).not.to.be.undefined;
  });

  it("Transaction is cached", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, { forcedClient: mockMccClient });
    const randomTxId = mockMccClient.randomHash32(true);
    const result = await cachedMccClient.getTransaction(randomTxId);
    expect(cachedMccClient.transactionCache.get(randomTxId)).not.to.be.undefined;
    expect(cachedMccClient.transactionCleanupQueue.size).to.equal(1);
    expect(randomTxId).to.equal(cachedMccClient.transactionCleanupQueue.first);
  });

  it("Transaction not recorded twice", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, { forcedClient: mockMccClient });
    const randomTxId = mockMccClient.randomHash32(true);
    await cachedMccClient.getTransaction(randomTxId);
    await cachedMccClient.getTransaction(randomTxId);
    expect(cachedMccClient.transactionCleanupQueue.size).to.equal(1);
  });

  it("Transaction cache is properly cleaned", async function () {
    const LIMIT = 100;
    const BATCH_SIZE = 10;
    const cachedMccClientOptions = {
      transactionCacheSize: LIMIT,
      blockCacheSize: LIMIT,
      cleanupChunkSize: BATCH_SIZE,
      activeLimit: 50,
      clientConfig: {} as any,
      forcedClient: mockMccClient,
    };
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, cachedMccClientOptions);

    for (let i = 0; i < LIMIT; i++) {
      const randomTxId = mockMccClient.randomHash32(true);
      await cachedMccClient.getTransaction(randomTxId);
      expect(cachedMccClient.cleanupCheckCounter).to.equal((i + 1) % BATCH_SIZE);
    }
    expect(cachedMccClient.transactionCleanupQueue.size).to.equal(LIMIT);
    for (let i = 0; i < BATCH_SIZE; i++) {
      const randomTxId = mockMccClient.randomHash32(true);
      await cachedMccClient.getTransaction(randomTxId);
    }
    expect(cachedMccClient.cleanupCheckCounter).to.equal(0);
    const first = cachedMccClient.transactionCleanupQueue.first;
    // allow for async cleanup
    expect(cachedMccClient.transactionCache.get(first)).not.to.be.undefined;
    await sleepms(10);
    expect(cachedMccClient.transactionCleanupQueue.size).to.equal(LIMIT);
    expect(cachedMccClient.transactionCache.get(first)).to.be.undefined;
  });

  it("Block is cached", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, { forcedClient: mockMccClient });
    const randomBlockHash = mockMccClient.randomHash32(true);
    await cachedMccClient.getBlock(randomBlockHash);
    expect(cachedMccClient.blockCache.get(randomBlockHash)).not.to.be.undefined;
    expect(cachedMccClient.blockCleanupQueue.size).to.equal(1);
    expect(randomBlockHash).to.equal(cachedMccClient.blockCleanupQueue.first);
    expect(await cachedMccClient.getBlockFromCache(randomBlockHash)).not.to.be.undefined;
  });

  it("Block not recorded twice", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, { forcedClient: mockMccClient });
    const randomBlockHash = mockMccClient.randomHash32(true);
    await cachedMccClient.getBlock(randomBlockHash);
    await cachedMccClient.getBlock(randomBlockHash);
    expect(cachedMccClient.blockCleanupQueue.size).to.equal(1);
  });

  it("Block by number is cached", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, { forcedClient: mockMccClient });

    const stub = sinon.stub(cachedMccClient.client, "getBlock").resolves(TestBlockXRPAlt);

    const block = await cachedMccClient.getBlock(28014612);

    const hash = "08E71799B2DDEE48F12A62626508D8F879E67FB2AB90FECECE4BC82650DA7D04";
    const cachedblock = cachedMccClient.blockCache.get(hash);

    expect(!cachedblock).to.be.false;
  });

  it("Block cache is properly cleaned", async function () {
    const LIMIT = 100;
    const BATCH_SIZE = 10;
    const cachedMccClientOptions = {
      transactionCacheSize: LIMIT,
      blockCacheSize: LIMIT,
      cleanupChunkSize: BATCH_SIZE,
      activeLimit: 50,
      clientConfig: {} as any,
      forcedClient: mockMccClient,
    };
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, cachedMccClientOptions);

    for (let i = 0; i < LIMIT; i++) {
      const randomBlockHash = mockMccClient.randomHash32(true);
      await cachedMccClient.getBlock(randomBlockHash);
      expect(cachedMccClient.cleanupCheckCounter).to.equal((i + 1) % BATCH_SIZE);
    }
    expect(cachedMccClient.blockCleanupQueue.size).to.equal(LIMIT);
    for (let i = 0; i < BATCH_SIZE; i++) {
      const randomBlockHash = mockMccClient.randomHash32(true);
      await cachedMccClient.getBlock(randomBlockHash);
    }
    expect(cachedMccClient.cleanupCheckCounter).to.equal(0);
    const first = cachedMccClient.blockCleanupQueue.first;
    // allow for async cleanup
    expect(cachedMccClient.blockCache.get(first)).not.to.be.undefined;
    await sleepms(10);
    expect(cachedMccClient.blockCleanupQueue.size).to.equal(LIMIT);
    expect(cachedMccClient.blockCache.get(first)).to.be.undefined;
  });
});
