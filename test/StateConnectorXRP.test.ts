import { LedgerResponse, TxResponse } from "xrpl";
import { AttestationType } from "../lib/AttestationData";
import { fullTransactionHash } from "../lib/flare-crypto/hashes";
import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { prettyPrint, toBN, TransactionAttestationRequest, txAttReqToAttestationRequest, verifyTransactionAttestation, verifyXRPPayment } from "../lib/MCC/tx-normalize";
import { HashTestInstance, StateConnectorInstance } from "../typechain-truffle";
import { testHashOnContract } from "./utils/test-utils";

const CLIENT = ChainType.XRP;
const URL = "https://xrplcluster.com";
const USERNAME = ""
const PASSWORD = ""
const TEST_TX_ID = "096C199D08C3718F8E4F46FC43C984143E528F31A81C6B55C7E18B3841CC2B87"

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

  it("Should hashing of a normalized transaction match to one in contract for XRP", async () => {
    let txData = await verifyTransactionAttestation(client.chainClient, {
      attestationType: AttestationType.TransactionFull,
      instructions: toBN(0),
      id: TEST_TX_ID,
      dataAvailabilityProof: "0x0",
      chainId: ChainType.XRP,
      blockNumber: 0 
    } as TransactionAttestationRequest)
    prettyPrint(txData!);

    let hash = fullTransactionHash(txData!);
    let res = testHashOnContract(txData!, hash!);
    assert(res);
  });

  it("Should make lots of attestation requests", async () => {
    let latestBlockNumber = await client.chainClient.getBlockHeight();
    let count = 1
    for (let i = latestBlockNumber - count; i < latestBlockNumber; i++) {
      let block = await client.chainClient.getBlock(i) as LedgerResponse;
      for (let tx of block.result.ledger.transactions!) {
        // console.log("----")
        if (verifyXRPPayment(tx)) {
          let tr = {
            id: tx,
            dataAvailabilityProof: "0x0",
            blockNumber: i,
            chainId: ChainType.XRP,
            attestationType: AttestationType.TransactionFull,
            instructions: toBN(0)
          } as TransactionAttestationRequest;
          let attRequest = txAttReqToAttestationRequest(tr);
        } else {
          // if((tx as any).TransactionType === 'Payment') {
          //   console.log(tx)
          // }

        }
      }

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
