import { IUtxoVinTransaction, MccUtxoClient, UtxoTransaction } from "@flarenetwork/mcc";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { LimitingProcessor } from "../../caching/LimitingProcessor";

export async function getFullTransactionUtxo(
  client: CachedMccClient,
  blockTransaction: UtxoTransaction,
  processor: LimitingProcessor
): Promise<UtxoTransaction> {
  processor.registerTopLevelJob();
  // here we could check if reference starts with 0x46425052 ()
  if (blockTransaction.reference.length > 0 && blockTransaction.type !== "coinbase") {
    blockTransaction.synchronizeAdditionalData();

    let txPromises = blockTransaction.data.vin.map((vin: IUtxoVinTransaction, index: number) => {
      if (vin.txid) {
        // the in-transactions are prepended to queue in order to process them earlier
        return processor.call(() => blockTransaction.vinVoutAt(index, client.client as MccUtxoClient), true) as Promise<UtxoTransaction>;
      }
    });

    await Promise.all(txPromises);

    processor.markTopLevelJobDone();

    return blockTransaction;
  } else {
    return blockTransaction;
  }
}
