import { ChainType, UtxoMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { ITransaction } from "@flarenetwork/mcc";
import { expect } from "chai";

const BtcMccConnection = {
  url: "https://bitcoin-api.flare.network",
  username: "public",
  password: "",
} as UtxoMccCreate;

let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
  transactionCacheSize: 2,
  blockCacheSize: 2,
  cleanupChunkSize: 2,
  activeLimit: 1,
  clientConfig: BtcMccConnection,
};

const txIds = [
  "9c915e1b3064fdb9d29180c19f4b55b8d502c082f877e5e38439afc5a05eb366",
  "c06b051f0130c1ab55d170ac9fd93aa287212d42682cc0a14a91bb3f2373808e",
  "6900702de82c50b17bf3bf748ff29ae3bb35e6f4df9d0f221877bf71255370bf",
  "6900702de82c50b17bf3bf748ff29ae3bb35e6f4df9d0f221877bf71255370bf",
  "1e8e41d68d5908d1bb592f3a5757f0cfb957ca6a30097c7d23966e73e629f6a7",
  "33dc1853ffd652d5d810ce36a00898ed6533123007ec2e2f9e1c3e5db246e31c",
];

const blockNumbers = [761_687, 761_688, 761_689];

describe("CachedClient", () => {
  let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
    transactionCacheSize: 2,
    blockCacheSize: 2,
    cleanupChunkSize: 2,
    activeLimit: 1,
    clientConfig: BtcMccConnection,
  };
  const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
  let txs = new Array<ITransaction>();
  before(async () => {
    for (let j = 0; j < 6; j++) {
      let tx = await cachedClient.getTransaction(txIds[j]);
      txs.push(tx);
    }
  });
  it("Should initiate cleanup", async () => {
    expect(cachedClient.transactionCache.size).to.be.eq(3);
    expect(cachedClient.cleanupCheckCounter).to.be.eq(1);
  });

  it("Should canAccept", () => {
    expect(cachedClient.canAccept).to.be.true;
  });

  it("Should get block by number(height)", async () => {
    let block = await cachedClient.getBlock(blockNumbers[0]);
    expect(block.blockHash).to.be.eq("000000000000000000071b49ea776882fa2f63786749e6acc9f1cec953feaf25");
  });
});

describe.skip("blockCacheSize=0 or other false", () => {
  let cachedMccClientOptionsFull2: CachedMccClientOptionsFull = {
    transactionCacheSize: 2,
    blockCacheSize: 0,
    cleanupChunkSize: 2,
    activeLimit: 1,
    clientConfig: BtcMccConnection,
  };
  cachedMccClientOptionsFull.blockCacheSize = 0;
  const cachedClient2 = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull2);
  let txs = new Array<ITransaction>();
  before(async () => {
    for (let j = 0; j < 6; j++) {
      let tx = await cachedClient2.getTransaction(txIds[j]);
      txs.push(tx);
    }
  });
  it("Should not initiate cleanup", async () => {
    expect(cachedClient2.transactionCache.size).to.be.eq(5);
    expect(cachedClient2.cleanupCheckCounter).to.be.eq(1);
  });
});
