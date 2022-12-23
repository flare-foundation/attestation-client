import { IUtxoVinTransaction, MccUtxoClient, UtxoTransaction } from "@flarenetwork/mcc";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { LimitingProcessor } from "../../caching/LimitingProcessor";

/**
 * Given a UTXO transaction it does additional processing on UTXO inputs.
 * The processing is done only if the transaction contains some kind of a payment reference (OP_RETURN).
 * Inputs of other transactions are not processed.
 * Processing inputs means that all transactions that appear on vin (inputs) are read and their respective
 * outputs are stored into additional field of the transaction record.
 * @param client chain client
 * @param blockTransaction specific transaction from the block to be processed with block processor
 * @param processor block processor
 * @returns processed transaction
 */
export async function getFullTransactionUtxo(
  client: CachedMccClient,
  blockTransaction: UtxoTransaction,
  processor: LimitingProcessor
): Promise<UtxoTransaction> {
  processor.registerTopLevelJob();
  // only for transactions with reference all input transactions are processed
  if (blockTransaction.reference.length > 0 && blockTransaction.type !== "coinbase") {
    blockTransaction.synchronizeAdditionalData();

    const txPromises = blockTransaction.data.vin.map((vin: IUtxoVinTransaction, index: number) => {
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
