import { NormalizedTransactionData, TransactionData } from "../../lib/MCC/tx-normalize";

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
        txData!.amount,
        txData!.gasOrFee,
        hash!
      ) 
}
