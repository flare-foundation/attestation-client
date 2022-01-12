import { AttestationType } from "../lib/AttestationData";
import { MCClient } from "../lib/MCC/MCClient";
import { ChainType, MCCNodeSettings } from "../lib/MCC/MCClientSettings";
import { AttestationRequest, attReqToTransactionAttestationRequest, extractAttEvents, numberOfConfirmations, TransactionAttestationRequest, transactionHash, txAttReqToAttestationRequest, VerificationStatus, verifyTransactionAttestation } from "../lib/Verification";
import { UtxoBlockResponse } from "../lib/MCC/UtxoCore";
import { prefix0x, toBN } from "../lib/utils";
import { StateConnectorInstance } from "../typechain-truffle";
import { sendAttestationRequest, testHashOnContract, verifyReceiptAgainstTemplate } from "./utils/test-utils";

const CLIENT = ChainType.BTC;
const URL = 'https://bitcoin.flare.network/';
const USERNAME = "flareadmin";
const PASSWORD = "mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4=";

// const ATTESTATION_TYPES = [AttestationType.FassetPaymentProof, AttestationType.BalanceDecreasingProof];
const ATTESTATION_TYPES = [AttestationType.FassetPaymentProof];

const StateConnector = artifacts.require("StateConnector");

async function testBTC(client: MCClient, stateConnector: StateConnectorInstance, txId: string, blockNumber: number, utxo: number, targetStatus: VerificationStatus) {
  let block = await client.chainClient.getBlock(blockNumber) as UtxoBlockResponse;
  let confirmationHeight = block.height + numberOfConfirmations(ChainType.BTC);
  let confirmationBlock = await client.chainClient.getBlock(confirmationHeight) as UtxoBlockResponse;
  let template = {
    attestationType: AttestationType.FassetPaymentProof,
    instructions: toBN(0),
    id: prefix0x(txId),
    utxo: utxo,
    dataAvailabilityProof: prefix0x(confirmationBlock.hash),
    chainId: ChainType.BTC,
    blockNumber: blockNumber
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
  assert(txData.verificationStatus === targetStatus, `Incorrect status ${txData.verificationStatus}`)
  if (targetStatus === VerificationStatus.OK) {
    let hash = transactionHash(web3, txData!);
    let res = testHashOnContract(txData!, hash!);
    assert(res);
  }
}

describe(`Test BTC`, async () => {
  let client: MCClient;
  let stateConnector: StateConnectorInstance;

  beforeEach(async () => {
    stateConnector = await StateConnector.new();
    client = new MCClient(new MCCNodeSettings(CLIENT, URL, USERNAME, PASSWORD, null));
  });

  it("Should succeed", async () => {
    await testBTC(client, stateConnector,
      "0x68250d3c77a60ea0eb4f6c934c06cb01376f40abf6b7b098ba14d18516119594",
      718115,
      0,
      VerificationStatus.OK
    )
  });

  it("Should return FUNDS_INCREASED", async () => {
    await testBTC(client, stateConnector,
      "0x8e4e680920a472533854f75bf04f25d1dab233207672ff22db6a691b4fa185ac",
      718109,
      0,
      VerificationStatus.FUNDS_INCREASED
    )
  });

  it("Should return FORBIDDEN_SELF_SENDING", async () => {
    await testBTC(client, stateConnector,
      "0xeb4c98eabb6325aaa424451485ced7cc2c1a7c55aa564ed9f4e9b93b74a95ef8",
      718115,
      0,
      VerificationStatus.FORBIDDEN_SELF_SENDING
    )
  });


  it("Should return NOT_SINGLE_DESTINATION_ADDRESS", async () => {
    await testBTC(client, stateConnector,
      "0x642ac657335c3d3ccc61a569f769aa754c0fda6a7155603b8ba12bfc4708fa6e",
      718115,
      0,
      VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS
    )
  });

  it("Should return EMPTY_IN_ADDRESS", async () => {
    await testBTC(client, stateConnector,
      "0x036b40d81875cdd8dfb4f4e114910309173a2d24cf008a6d9febb1ffdd569ea4",
      718115,
      0,
      VerificationStatus.EMPTY_IN_ADDRESS
    )
  });

  it("Should return WRONG_IN_UTXO", async () => {
    await testBTC(client, stateConnector,
      "0xceb8b1b28a12441d924b1443efbb282eec88d8dbd2790b93199cac0add6a0f22",
      718261,
      2,
      VerificationStatus.WRONG_IN_UTXO
    )
  });

  it.skip("Should make lots of attestation requests", async () => {
    let latestBlockNumber = await client.chainClient.getBlockHeight();
    // let latestBlockNumber = BLOCK_NUMBER + 8;
    let latestBlockNumberToUse = latestBlockNumber - numberOfConfirmations(ChainType.BTC);

    let count = 20;
    for (let i = latestBlockNumberToUse - count + 1; i <= latestBlockNumberToUse; i++) {
      let block = await client.chainClient.getBlock(i) as UtxoBlockResponse;
      let confirmationBlock = await client.chainClient.getBlock(i + numberOfConfirmations(ChainType.BTC)) as UtxoBlockResponse;
      for (let id of client.chainClient.getTransactionHashesFromBlock(block)) {
        for (let attType of ATTESTATION_TYPES) {
          for (let utxo = 0; utxo < 3; utxo++) {
            let tr = {
              id: prefix0x(id),
              dataAvailabilityProof: prefix0x(confirmationBlock.hash),
              utxo,
              blockNumber: i,
              chainId: ChainType.BTC,
              attestationType: attType,
              instructions: toBN(0)   // inital empty setting, will be consturcted
            } as TransactionAttestationRequest;
            console.log(`Checking: type: ${attType}, txid: ${tr.id}, block ${i}, utxo ${utxo}`);
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

            /////////////////////////////////////////////////////////////////
            /// Catching examples
            let experienced = [
              VerificationStatus.OK, 
              VerificationStatus.FUNDS_INCREASED,
              VerificationStatus.FORBIDDEN_SELF_SENDING,
              VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS,
              VerificationStatus.EMPTY_IN_ADDRESS,
              VerificationStatus.WRONG_IN_UTXO
            ]
            if(experienced.indexOf(txData.verificationStatus) >= 0) {
              continue;
            }
            /////////////////////////////////////////////////////////////////

            if (txData.verificationStatus != VerificationStatus.OK) {
              console.log(txData.verificationStatus);
              continue;
            }
            assert(txData.verificationStatus === VerificationStatus.OK, `Incorrect verification status ${txData.verificationStatus}`)
            console.log("GREAT!!!")
            let hash = transactionHash(web3, txData!);
            let res = testHashOnContract(txData!, hash!);
            assert(res);
          }
        }
      }
    }
  });
});
