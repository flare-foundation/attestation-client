import { NormalizedTransactionData } from "../../lib/MCC/tx-normalize";

export async function testHashOnContract(txData: NormalizedTransactionData, hash: string) {
  let HashTest = artifacts.require("HashTest");
  let hashTest = await HashTest.new();

  return await hashTest.test(
    txData!.attestationType,
    txData!.chainId,
    txData!.blockNumber,
    txData!.txId,
    txData!.utxo,
    txData!.sourceAddress,
    txData!.destinationAddress,
    txData!.destinationTag,
    txData!.spent,
    txData!.delivered,
    txData!.fee,
    hash!
  )
}

export async function requestAttestation(
  instructions: string,   // string encoded uint256
  id: string,             // string encoded bytes32
  dataAvailabilityProof: string // string encoded bytes32
) {
  
}