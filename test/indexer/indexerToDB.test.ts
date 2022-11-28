import { ChainType } from "@flarenetwork/mcc";
import { DBTransactionBase } from "../../lib/entity/indexer/dbTransaction";
import { IndexerToDB } from "../../lib/indexer/indexerToDB";
import { Interlacing } from "../../lib/indexer/interlacing";
import { DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { getGlobalLogger, globalTestLogger } from "../../lib/utils/logger";
import { promAugTxBTC0, promAugTxBTC1, promAugTxBTCALt0, promAugTxBTCAlt1 } from "../mockData/indexMock";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;

describe("IndexerToBD", function () {
  const databaseConnectOptions = new DatabaseSourceOptions();
  databaseConnectOptions.database = process.env.DATABASE_NAME1;
  databaseConnectOptions.username = process.env.DATABASE_USERNAME;
  databaseConnectOptions.password = process.env.DATBASE_PASS;
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions);

  let interlacing = new Interlacing();

  let augTx0: DBTransactionBase;
  let augTxAlt0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  let augTxAlt1: DBTransactionBase;

  const indexerToDB = new IndexerToDB(getGlobalLogger(), interlacing, dataService, ChainType.BTC);

  before(async () => {
    augTx0 = await promAugTxBTC0;
    augTxAlt0 = await promAugTxBTCALt0;
    augTx1 = await promAugTxBTC1;
    augTxAlt1 = await promAugTxBTCAlt1;

    if (!dataService.dataSource.isInitialized) {
      await dataService.init();
    }

    //start with empty tables
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.connection.query(`TRUNCATE ${tableName};`);
    }

    const tableName = "state";
    await dataService.connection.query(`TRUNCATE ${tableName};`);
  });

  it("Should get last processed and saved block number from DB", async function () {
    let res = await indexerToDB.getNfromDB();
    expect(res).to.be.eq(0);
  });
});
