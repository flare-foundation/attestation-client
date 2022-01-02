import { AttestationType } from "../../lib/AttestationData";
import { NormalizedTransactionData } from "../../lib/MCC/tx-normalize";

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
        txData!.sourceAddresses as string,
        txData!.destinationAddresses as string,
        txData!.destinationTag!,
        txData!.spent as BN,
        txData!.delivered as BN,
        hash!
      )
    case AttestationType.BalanceDecreasingProof:
      return await hashTest.testDecreaseBalanceProof(
        txData!.attestationType,
        txData!.chainId,
        txData!.blockNumber,
        txData!.txId,
        txData!.sourceAddresses as string,
        txData!.spent as BN,
        hash!
      )
    default:
      throw new Error(`Unsupported attestation type ${txData.attestationType}`)
  }
}

export async function requestAttestation(
  instructions: string,   // string encoded uint256
  id: string,             // string encoded bytes32
  dataAvailabilityProof: string // string encoded bytes32
) {

}