import {
  IXrpGetBlockRes,
  IXrpGetTransactionRes,
  UtxoBlock,
  UtxoMccCreate,
  UtxoTransaction,
  XrpBlock,
  XrpTransaction,
  xrp_ensure_data,
} from "@flarenetwork/mcc";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import { augmentTransactionUtxo, augmentTransactionXrp } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import { DBTransactionBTC0 } from "../../lib/entity/indexer/dbTransaction";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import * as resBTCTxAlt from "../mockData/BTCTxAlt.json";
import * as resXRPBlock from "../mockData/XRPBlock.json";
import * as resXRPTx from "../mockData/XRPTx.json";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { Interlacing } from "../../lib/indexer/interlacing";
import { globalTestLogger } from "../../lib/utils/logger";
import { DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { LimitingProcessor } from "../../lib/caching/LimitingProcessor";
import { UtxoBlockProcessor } from "../../lib/indexer/chain-collector-helpers/blockProcessor";
import { getFullTransactionUtxo } from "../../lib/indexer/chain-collector-helpers/readTransaction";

describe("augmentBlock", () => {
  it("Should create entity for a block", async () => {
    const block = new UtxoBlock(resBTCBlock);
    const augBlock = augmentBlock(DBBlockBTC, block);
    expect(augBlock.blockNumber).to.equal(729_410);
  });
});

describe("augmentTransaction", () => {
  it("Should create entity from a transaction for BTC", async () => {
    const block = new UtxoBlock(resBTCBlock);
    const tx = new UtxoTransaction(resBTCTx);
    const waitTx = async () => {
      return tx;
    };

    const augTx = await augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, block, waitTx());
    expect(augTx.blockNumber).to.be.eq(729_410);
    expect(augTx.transactionId).to.be.eq("b39d8e733bf9f874c7c82019d41b6df1c829f3988694adf5ebdadb1590832225");
  });

  it("Should create entity from a transaction for XRP", async () => {
    const txHash = "A8B4D5C887D0881881A0A45ECEB8D250BF53E6CAE9EB72B9D251C590BD9087AB";
    const blockId = 75660711;
    xrp_ensure_data(resXRPTx);
    const block = new XrpBlock(resXRPBlock as unknown as IXrpGetBlockRes);

    const tx = new XrpTransaction(resXRPTx as unknown as IXrpGetTransactionRes);

    const augTx = augmentTransactionXrp(DBTransactionBTC0, block, tx);
    expect(augTx.blockNumber).to.be.eq(blockId);
    expect(augTx.transactionId).to.be.eq(txHash);
    // });
  });
});

describe("readTransaction", () => {
  const BtcMccConnection = {
    url: process.env.BTC_URL,
    username: process.env.BTC_USERNAME,
    password: process.env.BTC_PASSWORD,
  } as UtxoMccCreate;

  let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
    transactionCacheSize: 2,
    blockCacheSize: 2,
    cleanupChunkSize: 2,
    activeLimit: 1,
    clientConfig: BtcMccConnection,
  };

  const databaseConnectOptions = new DatabaseSourceOptions();
  databaseConnectOptions.database = process.env.DATABASE_NAME1;
  databaseConnectOptions.username = process.env.DATABASE_USERNAME;
  databaseConnectOptions.password = process.env.DATBASE_PASS;
  const dataService = new DatabaseService(globalTestLogger, databaseConnectOptions);
  const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
  const interlacing = new Interlacing();
  let utxoBlockProcessor: UtxoBlockProcessor;
  const tx = new UtxoTransaction(resBTCTxAlt);
  before(async () => {
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 12);
    utxoBlockProcessor = new UtxoBlockProcessor(interlacing, cachedClient);
  });

  // it("should get full transaction utxo", async (done) => {
  //   console.log(tx.reference);
  //   const fullTx = await getFullTransactionUtxo(cachedClient, tx, utxoBlockProcessor);
  //   console.log(fullTx);
  // });
});
// describe("UtxoBlockProcessor", () => {
//   const BtcMccConnection = {
//     url: "https://bitcoin-api.flare.network",
//     username: "public",
//     password: "d681co1pe2l3wcj9adrm2orlk0j5r5gr3wghgxt58tvge594co0k1ciljxq9glei",
//   } as UtxoMccCreate;

//   let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
//     transactionCacheSize: 2,
//     blockCacheSize: 2,
//     cleanupChunkSize: 2,
//     activeLimit: 1,
//     clientConfig: BtcMccConnection,
//   };

//   const databaseConnectOptions = new DatabaseSourceOptions();
//   databaseConnectOptions.database = "AttDBtestLimit";
//   databaseConnectOptions.username = "root";
//   databaseConnectOptions.password = "praporscak";
//   const dataService = new DatabaseService(globalTestLogger, databaseConnectOptions);
//   const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
//   const interlacing = new Interlacing();
//   let utxoBlockProcessor: UtxoBlockProcessor;
//
// });
