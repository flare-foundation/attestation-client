import { FullBlockBase, MccUtxoClient, UtxoTransaction } from "@flarenetwork/mcc";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { LimitingProcessor } from "../../caching/LimitingProcessor";

/**
 * Options for full indexing. on the utxo (for now only doge) chains
 */
export enum FullIndexingOptions {
  all = "all",
  none = "none",
  withReference = "withReference",
  withStdReference = "withStdReference",
}

/**
 * Given a UTXO transaction it does additional processing on UTXO inputs.
 * The processing is done only if the transaction contains some kind of a payment reference (OP_RETURN).
 * Inputs of other transactions are not processed.
 * Processing inputs means that all transactions that appear on vin (inputs) are read and their respective
 * outputs are stored into additional field of the transaction record.
 * @param client chain client
 * @param blockTransaction specific transaction from the block to be processed with block processor
 * @param processor block processor
 * @param indexingOption indexing option
 * @returns processed transaction
 */
export async function getFullTransactionUtxo<B extends FullBlockBase<any>, T extends UtxoTransaction<any>>(
  client: CachedMccClient,
  blockTransaction: T,
  processor: LimitingProcessor<B>,
  txGetter: (txid: string) => Promise<T>,
  indexingOption: FullIndexingOptions = FullIndexingOptions.withReference
): Promise<T> {
  processor.registerTopLevelJob();
  let fullIndexing = false;
  switch (indexingOption) {
    case FullIndexingOptions.all:
      fullIndexing = true;
      break;
    case FullIndexingOptions.withReference:
      // only for transactions with reference all input transactions are processed
      fullIndexing = blockTransaction.reference.length > 0 && blockTransaction.type !== "coinbase";
      break;
    case FullIndexingOptions.withStdReference:
      // only transactions with standard reference are fully processed
      fullIndexing = blockTransaction.stdPaymentReference && blockTransaction.type !== "coinbase";
      break;
    case FullIndexingOptions.none:
    default:
      fullIndexing = false;
      break;
  }

  if (fullIndexing) {
    await blockTransaction.makeFull((id: string) => txGetter(id));

    processor.markTopLevelJobDone();

    return blockTransaction;
  } else {
    return blockTransaction;
  }
}
