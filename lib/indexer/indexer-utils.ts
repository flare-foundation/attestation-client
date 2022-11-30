import { ChainType } from "@flarenetwork/mcc";
import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../entity/indexer/dbBlock";
import {
  DBTransactionALGO0,
  DBTransactionALGO1,
  DBTransactionBase,
  DBTransactionBTC0,
  DBTransactionBTC1,
  DBTransactionDOGE0,
  DBTransactionDOGE1,
  DBTransactionLTC0,
  DBTransactionLTC1,
  DBTransactionXRP0,
  DBTransactionXRP1,
} from "../entity/indexer/dbTransaction";
import { getGlobalLogger, logException } from "../utils/logger";
import { getRetryFailureCallback } from "../utils/PromiseTimeout";

export const SECONDS_PER_DAY = 60 * 60 * 24;
export const SUPPORTED_CHAINS = [`xrp`, `btc`, `ltc`, "doge", "algo"];

/**
 * Returns a pair of entity tables for transactions used in interlacing tables.
 * Tables match the entities specific for the given chain type.
 * @param type - chain type
 * @category Indexer
 */
export function prepareIndexerTables(type: ChainType): { transactionTable: DBTransactionBase[]; blockTable: DBBlockBase } {
  const transactionTable = [];
  let blockTable;
  switch (type) {
    case ChainType.BTC:
      transactionTable.push(DBTransactionBTC0);
      transactionTable.push(DBTransactionBTC1);
      blockTable = DBBlockBTC;
      break;
    case ChainType.LTC:
      transactionTable.push(DBTransactionLTC0);
      transactionTable.push(DBTransactionLTC1);
      blockTable = DBBlockLTC;
      break;
    case ChainType.DOGE:
      transactionTable.push(DBTransactionDOGE0);
      transactionTable.push(DBTransactionDOGE1);
      blockTable = DBBlockDOGE;
      break;
    case ChainType.XRP:
      transactionTable.push(DBTransactionXRP0);
      transactionTable.push(DBTransactionXRP1);
      blockTable = DBBlockXRP;
      break;
    case ChainType.ALGO:
      transactionTable.push(DBTransactionALGO0);
      transactionTable.push(DBTransactionALGO1);
      blockTable = DBBlockALGO;
      break;
    case ChainType.invalid:
      throw new Error("Invalid chain type");
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(type);
  }
  return {
    transactionTable,
    blockTable,
  };
}

// this function will terminate app on exception
/**
 * Async function wrapper that kills the application in case of exception.
 * It is typically used as a safeguard for non-awaited async calls that
 * should have their own error handling, but in case it fails, some
 * critical situation has happened and the application should be terminated.
 * Note that on error, this wrapper calls global retryFailureCallback
 * which can be in case of testing sent differently.
 * @param label logging label
 * @param funct async function to be called
 * @returns
 * @category Indexer
 */
export async function criticalAsync(label: string, funct: (...args: any[]) => Promise<any>): Promise<any> {
  try {
    return await funct();
  } catch (error) {
    logException(error, label);

    const onFailure = getRetryFailureCallback();
    if (!onFailure) {
      getGlobalLogger().error2(`application exit`);
      process.exit(2);
    } else {
      onFailure(label);
    }
  }
}
