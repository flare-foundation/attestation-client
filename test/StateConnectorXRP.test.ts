
import { ChainType, MCC, prefix0x, toBN } from "flare-mcc";
import { LedgerResponse } from "xrpl";
import {
  attReqToTransactionAttestationRequest,
  extractAttEvents,
  transactionHash,
  txAttReqToAttestationRequest
} from "../lib/verification/attestation-request-utils";
import {
  AttestationRequest,
  AttestationType,
  TransactionAttestationRequest,
  VerificationStatus
} from "../lib/verification/attestation-types";
import { numberOfConfirmations } from "../lib/verification/confirmations";
import { verifyTransactionAttestation } from "../lib/verification/verification";
import { StateConnectorInstance } from "../typechain-truffle";
import { sendAttestationRequest, testHashOnContract, verifyReceiptAgainstTemplate } from "./utils/test-utils";

const CHAIN = ChainType.XRP;
const URL = "https://xrplcluster.com";
const USERNAME = ""
const PASSWORD = ""
const TEST_TX_ID = "096C199D08C3718F8E4F46FC43C984143E528F31A81C6B55C7E18B3841CC2B87"
const BLOCK_NUMBER = 67260195;
const DATA_AVAILABILITY_PROOF = "0x0071D0A312453E3D31772390BE5B9B06E7BBC40320BAA512FF67E84EE00A9F5F"
const ATTESTATION_TYPES = [AttestationType.Payment, AttestationType.BalanceDecreasingPayment];

// const HashTest = artifacts.require("HashTest");
const StateConnector = artifacts.require("StateConnector");

describe(`Test ${MCC.getChainTypeName(CHAIN)}`, async () => {
  let client: MCC.XRP;
  let stateConnector: StateConnectorInstance;

  beforeEach(async () => {
    stateConnector = await StateConnector.new();
    client = MCC.Client(CHAIN, { url: URL, username: USERNAME, password: PASSWORD }) as MCC.XRP;
  });

  it("Should hashing of a normalized transaction match to one in contract for XRP", async () => {
    // create attestation request ("abuse" conversion to build it)
    let template = {
      attestationType: AttestationType.Payment,
      instructions: toBN(0),
      id: prefix0x(TEST_TX_ID),
      dataAvailabilityProof: DATA_AVAILABILITY_PROOF,
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
    let txData = await verifyTransactionAttestation(client, txAttReq)
    assert(txData.verificationStatus === VerificationStatus.OK, `Incorrect status ${txData.verificationStatus}`)

    let hash = transactionHash(web3, txData!);
    let res = testHashOnContract(txData!, hash!);
    assert(res);
  });

  it("Should make lots of attestation requests", async () => {
    let latestBlockNumber = await client.getBlockHeight();
    let count = 3;
    for (let i = latestBlockNumber - count; i < latestBlockNumber; i++) {
      let block = await client.getBlock(i) as LedgerResponse;
      let nextBlock = await client.getBlock(i + numberOfConfirmations(ChainType.XRP)) as LedgerResponse;
      for (let tx of block.result.ledger.transactions!) {
        for (let attType of ATTESTATION_TYPES) {
          let tr = {
            id: prefix0x((tx as any).hash),
            dataAvailabilityProof: prefix0x(nextBlock.result.ledger_hash),
            blockNumber: i,
            chainId: ChainType.XRP,
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
          let txData = await verifyTransactionAttestation(client, eventRequest)
          if (txData.verificationStatus !== VerificationStatus.OK) {
            console.log(`Incorrect verification status ${txData.verificationStatus}`);
          }

          let hash = transactionHash(web3, txData!);
          let res = testHashOnContract(txData!, hash!);
          assert(res);
        }
      }

    }
  });
});
