import { TxResponse } from "xrpl";
import { fullTransactionHash } from "../lib/flare-crypto/hashes";
import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { ChainTransactionType, normalizeTransaction } from "../lib/MCC/tx-normalize";
import { testHashOnContract } from "./utils/test-utils";

const CLIENT = ChainType.XRP;
const URL = "https://xrplcluster.com";
const USERNAME = ""
const PASSWORD = ""
const TEST_TX_ID = "096C199D08C3718F8E4F46FC43C984143E528F31A81C6B55C7E18B3841CC2B87" 

describe(`Test`, async () => {
  let client: MCClient;

  beforeEach(async () => {
    client = new MCClient(new MCCNodeSettings(CLIENT, URL, USERNAME, PASSWORD, null));
  });

  it("Should hashing of a normalized transaction match to one in contract for XRP", async () => {
    let txResponse = await client.chainClient.getTransaction(TEST_TX_ID) as TxResponse;
    let txData = normalizeTransaction(ChainType.XRP, ChainTransactionType.FULL, txResponse);
    let hash = fullTransactionHash(txData!);
    let res = testHashOnContract(txData!, hash!);
    assert(res);
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
