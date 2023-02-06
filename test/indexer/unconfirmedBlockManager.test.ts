import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DBBlockDOGE } from "../../src/entity/indexer/dbBlock";
import { UnconfirmedBlockManager } from "../../src/indexer/UnconfirmedBlockManager";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

describe(`UnconfirmedBlockManager (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();
  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  let unconfirmedBlockManager = new UnconfirmedBlockManager(dataService, DBBlockDOGE, 7);

  before(async () => {
    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }

    //generate test table
    const tableName = "doge_block";
    await dataService.manager.query(`delete from ${tableName};`);
    for (let j = 5; j < 16; j++) {
      const entity = new DBBlockDOGE();
      entity.blockNumber = j;
      entity.blockHash = `${j}`;
      entity.timestamp = 10 + j;
      entity.confirmed = false;
      entity.transactions = 10;
      entity.previousBlockHash = `${j - 1}`;
      entity.numberOfConfirmations = 16 - j;
      await dataService.manager.save(entity);
    }
  });

  it("Should construct", function () {
    expect(unconfirmedBlockManager).to.not.be.undefined;
  });

  it("Should initalize", async function () {
    await unconfirmedBlockManager.initialize();
    expect(unconfirmedBlockManager.blockHashToEntity.size).to.eq(8);
  });

  it("Should add new block", function () {
    const entity = new DBBlockDOGE();
    entity.blockNumber = 16;
    entity.blockHash = "16";
    entity.timestamp = 26;
    entity.confirmed = false;
    entity.transactions = 10;
    entity.previousBlockHash = "15";

    unconfirmedBlockManager.addNewBlock(entity);
    expect(unconfirmedBlockManager.blockHashToEntity.size).to.eq(9);
    expect(unconfirmedBlockManager.changed.size).to.eq(9);
  });

  it("Should add new block", function () {
    const entity = new DBBlockDOGE();
    entity.blockNumber = 17;
    entity.blockHash = "17";
    entity.timestamp = 26;
    entity.confirmed = true;
    entity.transactions = 10;
    entity.previousBlockHash = "16";

    unconfirmedBlockManager.addNewBlock(entity);
    expect(unconfirmedBlockManager.blockHashToEntity.get("16").numberOfConfirmations).to.eq(1);
    expect(unconfirmedBlockManager.blockHashToEntity.size).to.eq(10);
    expect(unconfirmedBlockManager.changed.size).to.eq(10);
  });

  it("Should not add new block", function () {
    const entity = new DBBlockDOGE();
    entity.blockNumber = 17;
    entity.blockHash = "9";
    entity.timestamp = 26;
    entity.confirmed = true;
    entity.transactions = 10;
    entity.previousBlockHash = "16";

    unconfirmedBlockManager.addNewBlock(entity);
    expect(unconfirmedBlockManager.blockHashToEntity.get("16").numberOfConfirmations).to.eq(1);
    expect(unconfirmedBlockManager.blockHashToEntity.size).to.eq(10);
    expect(unconfirmedBlockManager.changed.size).to.eq(10);
  });

  it("Should get changed blocks", function () {
    let res = unconfirmedBlockManager.getChangedBlocks();
    expect(res.length).to.eq(10);
  });
});
