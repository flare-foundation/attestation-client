import { TransactionData } from "../../lib/MCC/tx-normalize";

export async function testHashOnContract(txData: TransactionData, hash: string) {
    let HashTest = artifacts.require("HashTest");
    let hashTest = await HashTest.new();

    return await hashTest.test(
        txData!.type,
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
