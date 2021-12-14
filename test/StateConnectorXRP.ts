import { Client, TxRequest } from "xrpl";
import { fullTransactionHash, xrpTransactionData } from "../lib/flare-crypto/hashes";
import { MCClient } from "../lib/MCC/MCClient";
import { HashTestInstance, StateConnectorInstance } from "../typechain-truffle";

describe(`Test`, async () => {
  let client: MCClient;
  let rippleApi: Client;
  let hashTest: HashTestInstance;

  beforeEach(async () => {
    // client = new MCClient(new MCCNodeSettings(ChainType.XRP, "wss://xrplcluster.com", "", "", null));
    const xrpl = require("xrpl")
    rippleApi = new xrpl.Client(
      "wss://xrplcluster.com",
      { timeout: 60000 }
    );
    await rippleApi.connect();
    let HashTest = artifacts.require("HashTest");
    hashTest = await HashTest.new();
  });

  afterEach(async () => {
    await rippleApi.disconnect();
  });


  it("Test XRP hash", async () => {
    let txId = "096C199D08C3718F8E4F46FC43C984143E528F31A81C6B55C7E18B3841CC2B87";
    // let tx = await client.getTransaction(new MCCTransaction(txId))
    let tx = await rippleApi.request({
      command: "tx",
      transaction: txId
    } as TxRequest)
    console.log(tx);
    let txData = await xrpTransactionData(tx);
    console.log(txData);
    let hash = fullTransactionHash(txData!)    
    console.log(hash)
    let res = await hashTest.test(
      txData!.type,
      txData!.chainId,
      txData!.blockNumber,
      txData!.txId,
      txData!.utxo,
      txData!.sourceAddress,
      txData!.destinationAddress,
      txData!.destinationTag,
      txData!.amount,
      txData!.gas,
      hash!
    )
    console.log(res);
  });
});

