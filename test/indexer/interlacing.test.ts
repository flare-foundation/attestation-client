import { ChainType, IUtxoGetBlockRes, UtxoBlock, UtxoTransaction } from "@flarenetwork/mcc";
import { Interlacing } from "../../lib/indexer/interlacing";
import { DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { globalTestLogger } from "../../lib/utils/logger";
import { expect } from "chai";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import * as resBTCBlockAlt from "../mockData/BTCBlockAlt.json";
import * as resBTCTxAlt from "../mockData/BTCTxAlt.json";
import { augmentTransactionUtxo } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import { DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { afterEach } from "mocha";

describe("interlacing", () => {
  const databaseConnectOptions = new DatabaseSourceOptions();
  databaseConnectOptions.database = "AttDBtest";
  databaseConnectOptions.username = "root";
  databaseConnectOptions.password = "praporscak";
  const dataService = new DatabaseService(globalTestLogger, databaseConnectOptions);

  let interlacing = new Interlacing();

  let augTx0: DBTransactionBase;
  let augTxAlt0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  let augTxAlt1: DBTransactionBase;

  before(async () => {
    const block = new UtxoBlock(resBTCBlock);
    const tx = new UtxoTransaction(resBTCTx);
    const blockAlt = new UtxoBlock(resBTCBlockAlt as unknown as IUtxoGetBlockRes);
    const txAlt = new UtxoTransaction(resBTCTxAlt);

    const waitTx = async (tx) => {
      return tx;
    };
    augTx0 = await augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, block, waitTx(tx));
    augTxAlt0 = await augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, blockAlt, waitTx(txAlt));
    augTx1 = await augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, block, waitTx(tx));
    augTxAlt1 = await augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, blockAlt, waitTx(txAlt));
  });

  beforeEach(async () => {
    if (dataService.dataSource.isInitialized) {
      await dataService.dataSource.destroy();
    }
    await dataService.init();

    // await dataService.manager.save(augTx1);
    // await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
  });

  afterEach(async () => {
    await interlacing.resetAll();
    if (dataService.dataSource.isInitialized) {
      await dataService.dataSource.destroy();
    }
  });

  // after(async ())

  it("should get active index for empty tables", async () => {
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(0);
  });

  it("should get active index for non-empty table", async () => {
    await dataService.dataSource.manager.save(augTx1);
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(1);
  });

  it("should reset all", async () => {
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(0);
  });

  it("should get index from later database", async () => {
    await dataService.dataSource.manager.save(augTx0);
    await dataService.dataSource.manager.save(augTxAlt1);
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(1);
  });

  it("should update initial", async () => {
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    let res = await interlacing.update(1668574798, 763380);
    expect(res).to.be.false;
  });

  it("should update", async () => {
    await dataService.dataSource.manager.save(augTx0);
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    let res = await interlacing.update(16685747980, 7633800);
    expect(res).to.be.true;
    expect(interlacing.activeIndex).to.be.equal(1);
  });

  it("should not update", async () => {
    await dataService.dataSource.manager.save(augTx0);
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    let res = await interlacing.update(10, 10);
    expect(res).to.be.false;
    // expect(interlacing.activeIndex).to.be.equal(0);
  });

  // it("should wait if tables are locked", async () => {} });
});
