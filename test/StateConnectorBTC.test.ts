import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { AttestTransactionType, normalizeTransaction } from "../lib/MCC/tx-normalize";
import { UtxoBlockResponse, UtxoTxResponse } from "../lib/MCC/UtxoCore";

const CLIENT = ChainType.BTC;
const URL = 'https://testnode2.c.aflabs.net/btc/';
const USERNAME = "rpcuser";
const PASSWORD = "rpcpass";
// const TEST_TX_ID = "b4542490567962c52c7f732deb9d1b1189a104481dc7e6eebc15e85011bc02ec";
// const TEST_TX_ID = "ba905920105a93fe938781c7e5f63f4eca02dc085090a64d561dca0892c6b97f";
const TEST_TX_ID = "568c58e7fa59bfd13d904e5c1fd8c4b97bd9d64cfc7644abe74541dc12adff35";


const UTXO = 0;

describe(`Test`, async () => {
  let client: MCClient;

  beforeEach(async () => {
    client = new MCClient(new MCCNodeSettings(CLIENT, URL, USERNAME, PASSWORD, null));
  });

  // it.only("Should hashing of a normalized transaction match to one in contract for DOGE", async () => {
  //   // let txData = await client.getTransaction(new MCCTransaction(txId));
  //   let normalizedTxData = await client.chainClient.getTransaction(TEST_TX_ID, { normalize: true, verbose: true });
  //   console.log(normalizedTxData)
  //   // let txData = wrapNormalizedTx(normalizedTxData, ChainTransactionType.FULL);
  //   // let hash = fullTransactionHash(txData!);
  //   // let res = testHashOnContract(txData, hash!);
  //   // assert(res);
  // });

  it("Should hashing of a normalized transaction match to one in contract for DOGE", async () => {
    let txResponse = await client.chainClient.getTransaction(TEST_TX_ID, {verbose: true}) as UtxoTxResponse;
    let blockResponse = await client.chainClient.getBlockHeader(txResponse.blockhash) as UtxoBlockResponse;
    let txData = await normalizeTransaction({
      chainType: ChainType.BTC,
      attestType: AttestTransactionType.FULL,
      txResponse, 
      blockResponse,
      utxo: UTXO,
      client
    });
    // let hash = fullTransactionHash(txData!);
    // let res = testHashOnContract(txData!, hash!);
    // assert(res);
  });

});



// afterEach(async () => {
//   // await rippleApi.disconnect();
// });

// Old code to delete

    // const xrpl = require("xrpl")
    // rippleApi = new xrpl.Client(
    //   "wss://xrplcluster.com",
    //   { timeout: 60000 }
    // );
    // await rippleApi.connect();


    // console.log(tx2);
    // let tx = await rippleApi.request({
    //   command: "tx",
    //   transaction: txId
    // } as TxRequest)
    // console.log(tx);
    // let txData = await xrpTransactionData(tx);
    // let normalizedTxData = {type: ChainTransactionType.FULL, ...txData} as TransactionData;
