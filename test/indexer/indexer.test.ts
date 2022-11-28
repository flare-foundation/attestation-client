import { ChainType } from "@flarenetwork/mcc";
import { Indexer } from "../../lib/indexer/indexer";
import { expect } from "chai";
import { DBBlockBTC, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { ChainConfiguration } from "../../lib/chain/ChainConfiguration";
import { DBTransactionXRP0, DBTransactionXRP1, DBTransactionBTC0, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { CachedMccClient } from "../../lib/caching/CachedMccClient";
import { MockMccClient, MockMccClientBTC } from "../../lib/caching/test-utils/MockMccClient";
import { IndexerConfiguration } from "../../lib/indexer/IndexerConfiguration";
import { getStateEntry, getStateEntryString } from "../../lib/indexer/indexer-utils";

describe("Indexer XRP", () => {
  let indexer = new Indexer(null, null, null, null);
  indexer.chainType = ChainType.XRP;
  indexer.chainConfig = new ChainConfiguration();
  indexer.chainConfig.name = "XRP";
  indexer.config = new IndexerConfiguration();
  indexer.prepareTables();
  const mockMccClient = new MockMccClient();
  indexer.cachedClient = new CachedMccClient(ChainType.XRP, { forcedClient: mockMccClient });

  it("Should prepare tables", () => {
    expect(indexer.dbBlockClass).to.eq(DBBlockXRP);
    expect(indexer.dbTransactionClasses[1]).to.eq(DBTransactionXRP1);
  });

  it.skip("Should getActiveTransactionWriteTable", () => {
    expect(indexer.interlace.getActiveTransactionWriteTable()).to.eq(DBTransactionXRP0);
  });

  it.skip("Should getBlockFromClient mock", async () => {
    let block = await indexer.indexerToClient.getBlockFromClient("nekej", 755_00_693);
    expect(block.number).to.be.equal(755_00_693);
  });

  it("Should getBlockFromClientbyHash mock", async () => {
    let block = await indexer.indexerToClient.getBlockFromClientByHash("nekej", "0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
    expect(block.blockHash).to.be.equal("0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });

  it("Should getStateEntry", () => {
    const state = getStateEntry("something", indexer.chainConfig.name, 42);
    expect(state.name).to.be.eq("XRP_something");
    expect(state.valueNumber).to.be.eq(42);
  });

  it("Should getStateEntryString", () => {
    const state = getStateEntryString("something", indexer.chainConfig.name, "something else", 42);
    expect(state.name).to.be.eq("XRP_something");
    expect(state.valueString).to.be.eq("something else");
  });
});

describe("Indexer BTC", () => {
  let indexer = new Indexer(null, null, null, null);
  indexer.chainType = ChainType.BTC;
  indexer.chainConfig = new ChainConfiguration();
  indexer.chainConfig.name = "BTC";
  indexer.config = new IndexerConfiguration();
  indexer.prepareTables();
  const mockMccClient = new MockMccClientBTC();
  indexer.cachedClient = new CachedMccClient(ChainType.BTC, { forcedClient: mockMccClient });

  it("Should prepare tables", () => {
    expect(indexer.dbBlockClass).to.eq(DBBlockBTC);
    expect(indexer.dbTransactionClasses[1]).to.eq(DBTransactionBTC1);
  });

  it.skip("Should getActiveTransactionWriteTable", () => {
    expect(indexer.interlace.getActiveTransactionWriteTable()).to.eq(DBTransactionBTC0);
  });

  // it.skip("Should getBlockFromClient mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockFromClient("nekej", 755_00_693);
  //   expect(block.number).to.be.equal(755_00_693);
  // });

  // it("Should getBlockFromClientbyHash mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockFromClientByHash("nekej", "0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  //   expect(block.blockHash).to.be.equal("0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  // });

  // it("Should getBlockHeaderFromClientbyHash mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockHeaderFromClientByHash("nekej", "0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  //   expect(block.blockHash).to.be.equal("0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  // });

  // it.skip("Should getBlockNumberTimestampFromClient mock", async () => {
  //   let timestamp = await indexer.indexerToClient.getBlockNumberTimestampFromClient(755_00_693);
  //   expect(timestamp).to.be.equal(1648480395);
  // });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });

  it("Should getStateEntry", () => {
    const state = getStateEntry("something", indexer.chainConfig.name, 42);
    expect(state.name).to.be.eq("BTC_something");
    expect(state.valueNumber).to.be.eq(42);
  });

  it("Should getStateEntryString", () => {
    const state = getStateEntryString("something", indexer.chainConfig.name, "something else", 42);
    expect(state.name).to.be.eq("BTC_something");
    expect(state.valueString).to.be.eq("something else");
  });
});
