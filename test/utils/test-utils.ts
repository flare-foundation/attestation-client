import { AttestationType } from "../../lib/AttestationData";
import { AttestationRequest, attReqToTransactionAttestationRequest, extractAttEvents, NormalizedTransactionData, TransactionAttestationRequest } from "../../lib/MCC/tx-normalize";
import { expectEvent } from "@openzeppelin/test-helpers";
import { StateConnectorInstance } from "../../typechain-truffle";
import { toBN } from "../../lib/utils";

export async function testHashOnContract(txData: NormalizedTransactionData, hash: string) {
  let HashTest = artifacts.require("HashTest");
  let hashTest = await HashTest.new();

  switch (txData.attestationType) {
    case AttestationType.FassetPaymentProof:
      return await hashTest.testFassetProof(
        txData!.attestationType,
        txData!.chainId,
        txData!.blockNumber,
        txData!.txId,
        txData!.inUtxo,
        web3.utils.soliditySha3(txData!.sourceAddresses as string)!,
        web3.utils.soliditySha3(txData!.destinationAddresses as string)!,
        txData!.destinationTag!,
        txData!.spent as BN,
        txData!.delivered as BN,
        txData!.fee as BN,
        toBN(txData!.status as number),
        hash!
      )
    case AttestationType.BalanceDecreasingProof:
      return await hashTest.testDecreaseBalanceProof(
        txData!.attestationType,
        txData!.chainId,
        txData!.blockNumber,
        txData!.txId,
        web3.utils.soliditySha3(txData!.sourceAddresses as string)!,
        txData!.spent as BN,
        hash!
      )
    default:
      throw new Error(`Unsupported attestation type ${txData.attestationType}`)
  }
}

export async function sendAttestationRequest(stateConnector: StateConnectorInstance, request: AttestationRequest) {
  return await stateConnector.requestAttestations(request.instructions, request.id, request.dataAvailabilityProof);
}

export function verifyReceiptAgainstTemplate(receipt: any, template: TransactionAttestationRequest) {
  expectEvent(receipt, "AttestationRequest")
  let events = extractAttEvents(receipt.logs);
  let parsedEvents = events.map((x: AttestationRequest) => attReqToTransactionAttestationRequest(x))
  assert(parsedEvents.length === 1);
  let eventRequest = parsedEvents[0];
  assert((eventRequest.blockNumber as BN).eq(toBN(template.blockNumber as number)), "Block number does not match");
  assert((eventRequest.chainId as BN).eq(toBN(template.chainId as number)), "Chain id  does not match");
  assert(eventRequest.attestationType === template.attestationType, "Attestation type does not match");
  return eventRequest;
}


// export async function requestAttestation(
//   instructions: string,   // string encoded uint256
//   id: string,             // string encoded bytes32
//   dataAvailabilityProof: string // string encoded bytes32
// ) {

// }