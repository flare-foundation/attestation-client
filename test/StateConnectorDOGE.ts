import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { ChainTransactionType, normalizeTransaction } from "../lib/MCC/tx-normalize";
import { UtxoBlockResponse, UtxoTxResponse } from "../lib/MCC/UtxoCore";

const CLIENT = ChainType.DOGE;
const URL = 'https://testnode2.c.aflabs.net/doge/';
const USERNAME = "rpcuser"
const PASSWORD = "rpcpass"
const TEST_TX_ID = "242cd280ec9ce026900d18665b296c784f15ce22360296655bcdfedd55ffbec4" 

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
    let txData = normalizeTransaction(ChainType.DOGE, ChainTransactionType.FULL, txResponse, blockResponse);
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
