import { expectEvent } from "@openzeppelin/test-helpers";
import { AttestationType } from "../lib/AttestationData";
import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { AttestationRequest, attReqToTransactionAttestationRequest, extractAttEvents, numberOfConfirmations, prettyPrint, TransactionAttestationRequest, transactionHash, txAttReqToAttestationRequest, VerificationStatus, verifyTransactionAttestation } from "../lib/MCC/tx-normalize";
import { UtxoBlockResponse } from "../lib/MCC/UtxoCore";
import { prefix0x, toBN } from "../lib/utils";
import { StateConnectorInstance } from "../typechain-truffle";
import { sendAttestationRequest, testHashOnContract, verifyReceiptAgainstTemplate } from "./utils/test-utils";

const CLIENT = ChainType.BTC;
const URL = 'https://testnode2.c.aflabs.net/btc/';
const USERNAME = "rpcuser";
const PASSWORD = "rpcpass";
const TEST_TX_ID = "4d0d61fd3ca1ccc3c023919f31d6a71fc3e0f3018c7238bdfc75a16898d9acbd";
// const UTXO = 1;
const BLOCK_NUMBER = 510824;
const DATA_AVAILABILITY_PROOF = "0x021b96f76654199b999ed82fc9d2a35f2091d0096a0b216774a7e2557d7fad03";
// const ATTESTATION_TYPES = [AttestationType.FassetPaymentProof, AttestationType.BalanceDecreasingProof];
const ATTESTATION_TYPES = [AttestationType.FassetPaymentProof];

const StateConnector = artifacts.require("StateConnector");

describe(`Test`, async () => {
  let client: MCClient;
  let stateConnector: StateConnectorInstance;

  beforeEach(async () => {
    stateConnector = await StateConnector.new();
    client = new MCClient(new MCCNodeSettings(CLIENT, URL, USERNAME, PASSWORD, null));
  });

  it("Should hashing of a normalized transaction match to one in contract for BTC", async () => {
    let template = {
      attestationType: AttestationType.FassetPaymentProof,
      instructions: toBN(0),
      id: prefix0x(TEST_TX_ID),
      dataAvailabilityProof: DATA_AVAILABILITY_PROOF,
      dataHash: "0x0",
      chainId: ChainType.BTC,
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

  it.only("Should make lots of attestation requests", async () => {
    let latestBlockNumber = await client.chainClient.getBlockHeight();
    let latestBlockNumberToUse = latestBlockNumber - numberOfConfirmations(ChainType.BTC);
    console.log(latestBlockNumberToUse)
    let count = 3
    for (let i = latestBlockNumberToUse - count + 1; i <= latestBlockNumberToUse; i++) {
      let block = await client.chainClient.getBlock(i) as UtxoBlockResponse;
      let confirmationBlock = await client.chainClient.getBlock(i + numberOfConfirmations(ChainType.BTC)) as UtxoBlockResponse;
      console.log(i);
      for (let id of client.chainClient.getTransactionHashesFromBlock(block)) {
        for (let attType of ATTESTATION_TYPES) {
          let tr = {
            id: prefix0x(id),
            dataHash: "0x0",  // TODO - for balance decreasing
            dataAvailabilityProof: prefix0x(confirmationBlock.hash),
            blockNumber: i,
            chainId: ChainType.BTC,
            attestationType: attType,
            instructions: toBN(0)   // inital empty setting, will be consturcted
          } as TransactionAttestationRequest;
          console.log(`Checking ${tr.id} for ${attType}`);
          let attRequest = txAttReqToAttestationRequest(tr);
          let receipt: any = null;
          try {
            receipt = await sendAttestationRequest(stateConnector, attRequest);
          } catch (e) {
            throw new Error(`${e}`);
          }
          let eventRequest = verifyReceiptAgainstTemplate(receipt, tr);

          // verify
          let txData = await verifyTransactionAttestation(client.chainClient, eventRequest)
          prettyPrint(txData);
          assert(txData.verificationStatus === VerificationStatus.OK, `Incorrect verification status ${txData.verificationStatus}`)
          let hash = transactionHash(web3, txData!);
          let res = testHashOnContract(txData!, hash!);
          assert(res);
        }
        // console.log(id);
        // let attType = AttestationType.FassetPaymentProof;
        // let tr = {
        //   id: id,
        //   dataAvailabilityProof: prefix0x(block.hash),
        //   dataHash: "0x2",
        //   blockNumber: i,
        //   chainId: ChainType.BTC,
        //   attestationType: attType,
        //   instructions: toBN(0)
        // } as TransactionAttestationRequest;
        // let attRequest = txAttReqToAttestationRequest(tr);
        // let receipt = await sendAttestationRequest(stateConnector, attRequest);
        // expectEvent(receipt, "AttestationRequest")
        // let events = extractAttEvents(receipt.logs);
        // let parsedEvents =  events.map((x: AttestationRequest) => attReqToTransactionAttestationRequest(x))
        // assert(parsedEvents.length === 1);
        // let parsedEvent = parsedEvents[0];
        // assert((parsedEvent.blockNumber as BN).eq(toBN(tr.blockNumber as number)), "Block number does not match");
        // assert((parsedEvent.chainId as BN).eq(toBN(tr.chainId as number)), "Chain id  does not match");
        // // assert((parsedEvent.utxo as BN).eq(toBN(0)), "Utxo does not match");
        // assert(parsedEvent.attestationType === attType, "Attestation type does not match");          
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
