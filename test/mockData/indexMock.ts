import { ChainType, IUtxoGetBlockRes, UtxoBlock, UtxoTransaction } from "@flarenetwork/mcc";
import { DBTransactionBTC0, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { augmentTransactionUtxo } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import * as resBTCTxAlt from "../mockData/BTCTxAlt.json";
import * as resBTCBlockAlt from "../mockData/BTCBlockAlt.json";

export const TestBlockBTC = new UtxoBlock(resBTCBlock);
export const TestTxBTC = new UtxoTransaction(resBTCTx);
export const TestBlockBTCAlt = new UtxoBlock(resBTCBlockAlt as unknown as IUtxoGetBlockRes);
export const TestTxBTCAlt = new UtxoTransaction(resBTCTxAlt);

const waitTx = async (tx) => {
  return tx;
};

export const promAugTxBTC0 = augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, TestBlockBTC, waitTx(TestTxBTC));
export const promAugTxBTC1 = augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, TestBlockBTC, waitTx(TestTxBTC));
export const promAugTxBTCALt0 = augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, TestBlockBTCAlt, waitTx(TestTxBTCAlt));
export const promAugTxBTCAlt1 = augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, TestBlockBTCAlt, waitTx(TestTxBTCAlt));
