import { expectEvent } from "@openzeppelin/test-helpers";
import { AttestationType } from "../lib/AttestationData";
import { fullTransactionHash } from "../lib/flare-crypto/hashes";
import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { AttestationRequest, attReqToTransactionAttestationRequest, extractAttEvents, prettyPrint, toBN, TransactionAttestationRequest, txAttReqToAttestationRequest, verifyTransactionAttestation } from "../lib/MCC/tx-normalize";
import { UtxoBlockResponse } from "../lib/MCC/UtxoCore";
import { HashTestInstance, StateConnectorInstance } from "../typechain-truffle";
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

const HashTest = artifacts.require("HashTest");
const StateConnector = artifacts.require("StateConnector");

describe(`Test`, async () => {
  let client: MCClient;
  let hashTest: HashTestInstance;
  let stateConnector: StateConnectorInstance;

  beforeEach(async () => {
    hashTest = await HashTest.new();
    stateConnector = await StateConnector.new();
    client = new MCClient(new MCCNodeSettings(CLIENT, URL, USERNAME, PASSWORD, null));
  });

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
    let count = 10
    for (let i = latestBlockNumber - count + 1; i <= latestBlockNumber; i++) {
      let block = await client.chainClient.getBlock(i) as UtxoBlockResponse;
      console.log(i);
      for(let id of client.chainClient.getTransactionHashesFromBlock(block)) {
        console.log(id);
        let attType = AttestationType.TransactionFull;
        let tr = {
          id: id,
          dataAvailabilityProof: "0x1",
          blockNumber: i,
          chainId: ChainType.BTC,
          attestationType: attType,
          instructions: toBN(0)
        } as TransactionAttestationRequest;
        let attRequest = txAttReqToAttestationRequest(tr);
        let receipt = await sendAttestationRequest(stateConnector, attRequest);
        expectEvent(receipt, "AttestationRequest")
        let events = extractAttEvents(receipt.logs);
        let parsedEvents =  events.map((x: AttestationRequest) => attReqToTransactionAttestationRequest(x))
        assert(parsedEvents.length === 1);
        let parsedEvent = parsedEvents[0];
        assert((parsedEvent.blockNumber as BN).eq(toBN(tr.blockNumber as number)), "Block number does not match");
        assert((parsedEvent.chainId as BN).eq(toBN(tr.chainId as number)), "Chain id  does not match");
        assert((parsedEvent.utxo as BN).eq(toBN(0)), "Utxo does not match");
        assert(parsedEvent.attestationType === attType, "Attestation type does not match");          
      }
    }
  });


});



async function sendAttestationRequest(stateConnector: StateConnectorInstance, request: AttestationRequest) {
  return await stateConnector.requestAttestations(request.instructions, request.id, request.dataAvailabilityProof);
}


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
