import { expectEvent } from "@openzeppelin/test-helpers";
import { LedgerResponse } from "xrpl";
import { AttestationType } from "../lib/AttestationData";
import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { AttestationRequest, attReqToTransactionAttestationRequest, extractAttEvents, prettyPrint, toBN, TransactionAttestationRequest, transactionHash, txAttReqToAttestationRequest, VerificationStatus, verifyTransactionAttestation, verifyXRPPayment } from "../lib/MCC/tx-normalize";
import { HashTestInstance, StateConnectorInstance } from "../typechain-truffle";
import { testHashOnContract } from "./utils/test-utils";

const CLIENT = ChainType.XRP;
const URL = "https://xrplcluster.com";
const USERNAME = ""
const PASSWORD = ""
const TEST_TX_ID = "096C199D08C3718F8E4F46FC43C984143E528F31A81C6B55C7E18B3841CC2B87"
const BLOCK_NUMBER = 67260195;
const DATA_AVAILABILITY_PROOF = "0x0071D0A312453E3D31772390BE5B9B06E7BBC40320BAA512FF67E84EE00A9F5F"

// const TEST_TX_ID = "943C99555142C7CFE44F61F25BD2F51B54F64ADDEEFCD242E600FFBA7796E914"
// const BLOCK_NUMBER = 68739434;


const HashTest = artifacts.require("HashTest");
const StateConnector = artifacts.require("StateConnector");

async function sendAttestationRequest(stateConnector: StateConnectorInstance, request: AttestationRequest) {
  return await stateConnector.requestAttestations(request.instructions, request.dataHash, request.id, request.dataAvailabilityProof);
}


describe(`Test`, async () => {
  let client: MCClient;
  // let hashTest: HashTestInstance;
  let stateConnector: StateConnectorInstance;

  beforeEach(async () => {
    // hashTest = await HashTest.new();
    stateConnector = await StateConnector.new();
    client = new MCClient(new MCCNodeSettings(CLIENT, URL, USERNAME, PASSWORD, null));
  });

  it("Should hashing of a normalized transaction match to one in contract for XRP", async () => {
    // create attestation request ("abuse" conversion to build it)
    let template = {
      attestationType: AttestationType.FassetPaymentProof,
      instructions: toBN(0),
      id: "0x" + TEST_TX_ID,
      dataAvailabilityProof: DATA_AVAILABILITY_PROOF,
      dataHash: "0x0",
      chainId: ChainType.XRP,
      blockNumber: BLOCK_NUMBER
    } as TransactionAttestationRequest;
    let request = txAttReqToAttestationRequest(template);

    // send it to contract
    let receipt: any = null;
    try {
      receipt = await sendAttestationRequest(stateConnector, request);
    } catch (e) {
      throw new Error(`${e}`)
    }
    // intercept events
    let events = extractAttEvents(receipt.logs);
    let parsedEvents = events.map((x: AttestationRequest) => attReqToTransactionAttestationRequest(x))
    assert(parsedEvents.length === 1);
    let txAttReq = parsedEvents[0];

    // verify
    let txData = await verifyTransactionAttestation(client.chainClient, txAttReq)
    assert(txData.verificationStatus === VerificationStatus.OK, `Incorrect status ${txData.verificationStatus}`)

    let hash = transactionHash(web3, txData!);
    let res = testHashOnContract(txData!, hash!);
    assert(res);
  });

  it("Should make lots of attestation requests", async () => {
    let latestBlockNumber = await client.chainClient.getBlockHeight();
    let count = 3
    for (let i = latestBlockNumber - count; i < latestBlockNumber; i++) {
      let block = await client.chainClient.getBlock(i) as LedgerResponse;
      let nextBlock = await client.chainClient.getBlock(i + 1) as LedgerResponse;
      for (let tx of block.result.ledger.transactions!) {
        // console.log("----")
        if (verifyXRPPayment(tx)) {
          let attType = AttestationType.FassetPaymentProof;
          let tr = {
            id: "0x" + (tx as any).hash,
            dataHash: "0x0",
            dataAvailabilityProof: "0x" + nextBlock.result.ledger_hash,
            blockNumber: i,
            chainId: ChainType.XRP,
            attestationType: attType,
            instructions: toBN(0)   // inital empty setting, will be consturcted
          } as TransactionAttestationRequest;
          let attRequest = txAttReqToAttestationRequest(tr);
          let receipt: any = null;
          try {
            receipt = await sendAttestationRequest(stateConnector, attRequest);
          } catch (e) {
            throw new Error(`${e}`)
          }
          expectEvent(receipt, "AttestationRequest")
          let events = extractAttEvents(receipt.logs);
          let parsedEvents = events.map((x: AttestationRequest) => attReqToTransactionAttestationRequest(x))
          assert(parsedEvents.length === 1);
          let parsedEvent = parsedEvents[0];
          assert((parsedEvent.blockNumber as BN).eq(toBN(tr.blockNumber as number)), "Block number does not match");
          assert((parsedEvent.chainId as BN).eq(toBN(tr.chainId as number)), "Chain id  does not match");
          assert(parsedEvent.attestationType === attType, "Attestation type does not match");

          // verify
          let txData = await verifyTransactionAttestation(client.chainClient, parsedEvent)
          assert(txData.verificationStatus === VerificationStatus.OK, `Incorrect status ${txData.verificationStatus}`)
          let hash = transactionHash(web3, txData!);
          let res = testHashOnContract(txData!, hash!);
          assert(res);

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
