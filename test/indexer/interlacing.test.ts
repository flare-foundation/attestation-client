import { ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import { afterEach } from "mocha";
import sinon from "sinon";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBase, DBTransactionBTC0 } from "../../src/entity/indexer/dbTransaction";
import { Interlacing } from "../../src/indexer/interlacing";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { promAugTxBTC0, promAugTxBTC1, promAugTxBTCAlt0, promAugTxBTCAlt1 } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";
import * as utils from "../../src/utils/helpers/utils";

describe(`Interlacing (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();
  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  let interlacing = new Interlacing();

  let augTx0: DBTransactionBase;
  let augTxAlt0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  let augTxAlt1: DBTransactionBase;

  before(async () => {
    augTx0 = await promAugTxBTC0;
    augTxAlt0 = await promAugTxBTCAlt0;
    augTx1 = await promAugTxBTC1;
    augTxAlt1 = await promAugTxBTCAlt1;

    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }

    //start with empty tables
    for (let i = 0; i < 2; i++) {
      const queryRunner = dataService.manager.connection.createQueryRunner();
      const tableName = `btc_transactions${i}`;
      const table = await queryRunner.getTable(tableName);
      await queryRunner.dropTable(table);
      await queryRunner.release();
    }
  });

  beforeEach(async () => {
    if (dataService.dataSource.isInitialized) {
      await dataService.dataSource.destroy();
    }
    await dataService.connect();

    // await dataService.manager.save(augTx1);
    // await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
  });

  afterEach(async () => {
    await interlacing.resetAll();
    if (dataService.dataSource.isInitialized) {
      await dataService.dataSource.destroy();
    }
    sinon.restore();
  });

  it("Should get active index for empty tables", async () => {
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(0);
  });

  it("Should get active index for non-empty table", async () => {
    await dataService.dataSource.manager.save(augTx1);
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(1);
  });

  it("Should reset all", async () => {
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(0);
  });

  it("Should get index from later database #1", async () => {
    await dataService.dataSource.manager.save(augTx0);
    await dataService.dataSource.manager.save(augTxAlt1);
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(1);
  });

  it("Should get index from later database #2", async () => {
    await dataService.dataSource.manager.save(augTx1);
    await dataService.dataSource.manager.save(augTxAlt0);
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    expect(interlacing.activeIndex).to.be.equal(0);
  });

  it("Should update initial", async () => {
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    let res = await interlacing.update(1668574798, 763380);
    expect(res).to.be.false;
  });

  it("Should get indexer transaction classes", async () => {
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    let res = interlacing.DBTransactionClasses[0];
    expect(res).to.be.eq(DBTransactionBTC0);
  });

  it("Should get block indexer tables", async () => {
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    let res = interlacing.DBBlockClass;
    expect(res).to.be.eq(DBBlockBTC);
  });

  it("Should getActiveTransactionWriteTable", async function () {
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
    const res = interlacing.getActiveTransactionWriteTable();
    expect(res).to.eq(DBTransactionBTC0);
  });

  describe("Tables updates", function () {
    it("Should update", async () => {
      await dataService.dataSource.manager.save(augTx0);
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
      let res = await interlacing.update(16685747980, 7633800);
      expect(res).to.be.true;
      expect(interlacing.activeIndex).to.be.equal(1);
    });

    it("Should wait for table to unlock update", async function () {
      await dataService.dataSource.manager.save(augTx0);
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);

      interlacing
        .update(16685757980, 7643800)
        .then(() => {})
        .catch((e) => getGlobalLogger().error("interlacing.update failed"));
      const spy = sinon.spy(utils, "sleepms");
      await interlacing.update(16685747980, 7633800);
      expect(spy.calledWith(1)).to.be.true;
      sinon.restore();
    });

    it("Should wait for table to unlock resetAll", async function () {
      await dataService.dataSource.manager.save(augTx0);
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
      interlacing
        .resetAll()
        .then(() => {})
        .catch((e) => getGlobalLogger().error("interlacing.update failed"));
      const spy = sinon.spy(utils, "sleepms");
      expect(spy.calledWith(1)).to.be.false;
      await interlacing.resetAll();
      expect(spy.calledWith(1)).to.be.true;
    });

    it("Should not update", async () => {
      await dataService.dataSource.manager.save(augTx0);
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
      let res = await interlacing.update(10, 10);
      expect(res).to.be.false;
      // expect(interlacing.activeIndex).to.be.equal(0);
    });
  });
});
