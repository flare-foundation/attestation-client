import { AttestationType } from "../lib/AttestationData";
import { fullTransactionHash } from "../lib/flare-crypto/hashes";
import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { prettyPrint, toBN, TransactionAttestationRequest, verifyTransactionAttestation } from "../lib/MCC/tx-normalize";
import { UtxoBlockResponse } from "../lib/MCC/UtxoCore";
import { testHashOnContract } from "./utils/test-utils";

const CLIENT = ChainType.BTC;
const URL = 'https://testnode2.c.aflabs.net/btc/';
const USERNAME = "rpcuser";
const PASSWORD = "rpcpass";
// const TEST_TX_ID = "b4542490567962c52c7f732deb9d1b1189a104481dc7e6eebc15e85011bc02ec";
// const TEST_TX_ID = "ba905920105a93fe938781c7e5f63f4eca02dc085090a64d561dca0892c6b97f";
// const TEST_TX_ID = "568c58e7fa59bfd13d904e5c1fd8c4b97bd9d64cfc7644abe74541dc12adff35";
const TEST_TX_ID = "4d0d61fd3ca1ccc3c023919f31d6a71fc3e0f3018c7238bdfc75a16898d9acbd";
const UTXO = 1;

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

  it("Should hashing of a normalized transaction match to one in contract for BTC", async () => {

    let txData = await verifyTransactionAttestation(client.chainClient, {
      attestationType: AttestationType.TransactionFull,
      instructions: toBN(0),
      id: TEST_TX_ID,
      dataAvailabilityProof: "0x0",
      chainId: ChainType.BTC,
      utxo: UTXO,
      blockNumber: 0 
    } as TransactionAttestationRequest)
    prettyPrint(txData!);

    let hash = fullTransactionHash(txData!);
    let res = testHashOnContract(txData!, hash!);
    assert(res);
  });

  it("Should make lots of attestation requests", async () => {
    let latestBlockNumber = await client.chainClient.getBlockHeight();
    console.log(latestBlockNumber)
    let count = 100
    for (let i = latestBlockNumber - count + 1; i <= latestBlockNumber; i++) {
      let block = await client.chainClient.getBlock(i) as UtxoBlockResponse;
      console.log(i);
      for(let txHash of block.tx) {
        console.log(txHash)
      }
      // for(let tx of block.result.ledger.transactions!) {
      //   console.log("----")
      //   if(verifyXRPPayment(tx)) {
          
      //   } else {
      //     // if((tx as any).TransactionType === 'Payment') {
      //     //   console.log(tx)
      //     // }
          
      //   }
      // }

    }
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
