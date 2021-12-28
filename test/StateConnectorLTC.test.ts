// import { MCClient } from "../lib/MCC/MCClient";
// import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
// import { AttestationType, normalizeTransaction } from "../lib/MCC/tx-normalize";
// import { UtxoBlockHeaderResponse, UtxoTxResponse } from "../lib/MCC/UtxoCore";

// const CLIENT = ChainType.LTC;
// const URL = 'https://litecoin.flare.network/';
// const USERNAME = "public";
// const PASSWORD = "gA4Yv3cnuXrIvP_7VIZjW1yliZ9GAclj1Td6tRITc6s=";
// const TEST_TX_ID = "d21510ed227dfba9cc3de386f4a3d0a8c137d6365ff1dc3f61a4de6401ca1454";
// const UTXO = 0;

// describe(`Test`, async () => {
//   let client: MCClient;

//   beforeEach(async () => {
//     client = new MCClient(new MCCNodeSettings(CLIENT, URL, USERNAME, PASSWORD, null));
//   });

//   // it.only("Should hashing of a normalized transaction match to one in contract for DOGE", async () => {
//   //   // let txData = await client.getTransaction(new MCCTransaction(txId));
//   //   let normalizedTxData = await client.chainClient.getTransaction(TEST_TX_ID, { normalize: true, verbose: true });
//   //   console.log(normalizedTxData)
//   //   // let txData = wrapNormalizedTx(normalizedTxData, ChainTransactionType.FULL);
//   //   // let hash = fullTransactionHash(txData!);
//   //   // let res = testHashOnContract(txData, hash!);
//   //   // assert(res);
//   // });

//   it("Should hashing of a normalized transaction match to one in contract for DOGE", async () => {
//     let txResponse = await client.chainClient.getTransaction(TEST_TX_ID, {verbose: true}) as UtxoTxResponse;
//     let blockResponse = await client.chainClient.getBlockHeader(txResponse.blockhash) as UtxoBlockHeaderResponse;
//     let txData = normalizeTransaction({
//       chainType: ChainType.BTC,
//       attestType: AttestationType.FULL,
//       txResponse, 
//       blockResponse,
//       utxo: UTXO
//     });
//     // let hash = fullTransactionHash(txData!);
//     // let res = testHashOnContract(txData!, hash!);
//     // assert(res);
//   });

// });



// // afterEach(async () => {
// //   // await rippleApi.disconnect();
// // });

// // Old code to delete

//     // const xrpl = require("xrpl")
//     // rippleApi = new xrpl.Client(
//     //   "wss://xrplcluster.com",
//     //   { timeout: 60000 }
//     // );
//     // await rippleApi.connect();


//     // console.log(tx2);
//     // let tx = await rippleApi.request({
//     //   command: "tx",
//     //   transaction: txId
//     // } as TxRequest)
//     // console.log(tx);
//     // let txData = await xrpTransactionData(tx);
//     // let normalizedTxData = {type: ChainTransactionType.FULL, ...txData} as TransactionData;
