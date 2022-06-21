import { ChainType } from "@flarenetwork/mcc";
import { DBBlockALGO, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../entity/indexer/dbBlock";
import {
  DBTransactionALGO0,
  DBTransactionALGO1,
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

export const SECONDS_PER_DAY = 60 * 60 * 24;

export function prepareIndexerTables(type: ChainType) {
  let transactionTable = [];
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

export async function noAwaitAsyncTerminateAppOnException(label: string, fun: (...args: any[]) => Promise<any>) {
  try {
    await fun();
  } catch (error) {
    logException(error, label);

    getGlobalLogger().error2(`application exit`);
    process.exit(2);
  }
}
