import { ChainType } from "@flarenetwork/mcc";
import { Indexer } from "../../lib/indexer/indexer";
import { expect } from "chai";
import { DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { ChainConfiguration } from "../../lib/chain/ChainConfiguration";
import { DBTransactionXRP0, DBTransactionXRP1 } from "../../lib/entity/indexer/dbTransaction";
import { CachedMccClient } from "../../lib/caching/CachedMccClient";
import { MockMccClient } from "../../lib/caching/test-utils/MockMccClient";
import { IndexerConfiguration } from "../../lib/indexer/IndexerConfiguration";

describe("Indexer", () => {
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

  it("Should getActiveTransactionWriteTable", () => {
    expect(indexer.getActiveTransactionWriteTable()).to.eq(DBTransactionXRP0);
  });

  it("Should getBlockFromClient mock", async () => {
    let block = await indexer.getBlockFromClient("nekej", 755_00_693);
    expect(block.number).to.be.equal(755_00_693);
  });

  it("Should getBlockFromClientbyHash mock", async () => {
    let block = await indexer.getBlockFromClientByHash("nekej", "0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
    expect(block.blockHash).to.be.equal("0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });

  it("Should getStateEntry", () => {
    const state = indexer.getStateEntry("something", 42);
    expect(state.name).to.be.eq("XRP_something");
    expect(state.valueNumber).to.be.eq(42);
  });

  it("Should getStateEntryString", () => {
    const state = indexer.getStateEntryString("something", "something else", 42);
    expect(state.name).to.be.eq("XRP_something");
    expect(state.valueString).to.be.eq("something else");
  });
});
