import { ChainType, IUtxoGetBlockRes, IXrpGetBlockRes, UtxoBlock, UtxoTransaction, XrpBlock } from "@flarenetwork/mcc";
import { DBTransactionBTC0, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { augmentTransactionUtxo } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import * as resBTCTxFake from "../mockData/BTCTxFake.json";
import * as resBTCTxAlt from "../mockData/BTCTxAlt.json";
import * as resBTCBlockAlt from "../mockData/BTCBlockAlt.json";
import * as resDOGEBlock from "../mockData/DOGEBlock.json";
import * as resXRPEBlock from "../mockData/XRPBlockAlt.json";
import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";

export const TestBlockBTC = new UtxoBlock(resBTCBlock);
export const TestTxBTC = new UtxoTransaction(resBTCTx);
export const TestBlockBTCAlt = new UtxoBlock(resBTCBlockAlt as unknown as IUtxoGetBlockRes);
export const TestTxBTCAlt = new UtxoTransaction(resBTCTxAlt);
export const TestTxBTCFake = new UtxoTransaction(resBTCTxFake);

export const TestBlockDOGE = new UtxoBlock(resDOGEBlock as unknown as IUtxoGetBlockRes);

export const TestBlockXRP = new XrpBlock(resXRPEBlock as unknown as IXrpGetBlockRes);

export const AugTestBlockBTC = augmentBlock(DBBlockBTC, TestBlockBTC);
export const AugTestBlockBTCAlt = augmentBlock(DBBlockBTC, TestBlockBTCAlt);

const waitTx = async (tx) => {
  return tx;
};

export const promAugTxBTC0 = augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, TestBlockBTC, waitTx(TestTxBTC));
export const promAugTxBTC1 = augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, TestBlockBTC, waitTx(TestTxBTC));
export const promAugTxBTCALt0 = augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, TestBlockBTCAlt, waitTx(TestTxBTCAlt));
export const promAugTxBTCAlt1 = augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, TestBlockBTCAlt, waitTx(TestTxBTCAlt));
