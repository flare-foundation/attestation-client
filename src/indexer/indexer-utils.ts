import { ChainType } from "@flarenetwork/mcc";
import { DBBlockBTC, DBBlockDOGE, DBBlockXRP, IDBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import {
  DBTransactionBTC0,
  DBTransactionBTC1,
  DBTransactionDOGE0,
  DBTransactionDOGE1,
  DBTransactionXRP0,
  DBTransactionXRP1,
  IDBTransactionBase,
} from "../entity/indexer/dbTransaction";
import { getRetryFailureCallback } from "../utils/helpers/promiseTimeout";
import { getUnixEpochTimestamp } from "../utils/helpers/utils";
import { getGlobalLogger, logException } from "../utils/logging/logger";

export const SECONDS_PER_DAY = 60 * 60 * 24;
export const SUPPORTED_CHAINS = [`xrp`, `btc`, "doge"];

export interface IndexerTablesScheme {
  transactionTable: IDBTransactionBase[];
  blockTable: IDBBlockBase;
}

/**
 * Returns a pair of entity tables for transactions used in interlacing tables.
 * Tables match the entities specific for the given chain type.
 * @param type - chain type
 * @category Indexer
 */
export function prepareIndexerTables(type: ChainType): IndexerTablesScheme {
  const transactionTable = [];
  let blockTable;
  switch (type) {
    case ChainType.BTC:
      transactionTable.push(DBTransactionBTC0);
      transactionTable.push(DBTransactionBTC1);
      blockTable = DBBlockBTC;
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
    case ChainType.invalid:
      throw new Error("Invalid chain type");
    default:
      throw new Error("Invalid chain type");

    //// exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
    //((_: never): void => {})(type);
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
      const logger = getGlobalLogger();
      logger.error2(`application exit`);
      process.exit(2);
    } else {
      onFailure(label);
    }
  }
}

/**
 * Constructs dbState entity for key-value pair
 * @param name name associated to key
 * @param chainName
 * @param value (number)
 * @returns
 */
export function getStateEntry(name: string, chainName: string, value: number): DBState {
  const state = new DBState();

  state.name = prefixChainNameTo(name, chainName);
  state.valueNumber = value;
  state.timestamp = getUnixEpochTimestamp();

  return state;
}

/**
 * Construct dbState entity for key-values entry, that contains string, number and comment values.
 * @param name
 * @param chainName
 * @param valueString
 * @param valueNum
 * @param comment
 * @returns
 */
export function getStateEntryString(name: string, chainName: string, valueString: string, valueNum: number, comment = ""): DBState {
  const state = new DBState();

  state.name = prefixChainNameTo(name, chainName);
  state.valueString = valueString;
  state.valueNumber = valueNum;
  state.timestamp = getUnixEpochTimestamp();
  state.comment = comment;

  return state;
}

/**
 * Prefixes chain name and underscore to the given name
 * @param name
 * @param chainName
 * @returns
 */
function prefixChainNameTo(name: string, chainName: string) {
  return chainName.toLowerCase() + "_" + name;
}

/**
 * Returns entry key for N in the database.
 * @param chainName
 * @returns
 */
export function getChainN(chainName: string) {
  return prefixChainNameTo("N", chainName);
}
