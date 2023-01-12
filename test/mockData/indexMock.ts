import {
  ChainType,
  IUtxoGetBlockRes,
  IXrpGetBlockRes,
  IXrpGetTransactionRes,
  LtcBlockHeader,
  UtxoBlock,
  UtxoTransaction,
  XrpBlock,
  XrpNodeStatus,
  XrpTransaction,
} from "@flarenetwork/mcc";
import { DBTransactionBTC0, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { augmentTransactionUtxo } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import * as resBTCTxFake from "../mockData/BTCTxFake.json";
import * as resBTCTxAlt from "../mockData/BTCTxAlt.json";
import * as resBTCBlockAlt from "../mockData/BTCBlockAlt.json";
import * as resDOGEBlock from "../mockData/DOGEBlock.json";
import * as resXRPBlockAlt from "../mockData/XRPBlockAlt.json";
import * as resXRPBlock from "../mockData/XRPBlock.json";
import * as resXRPBlockFake from "../mockData/XRPBlockFake.json";
import * as resXRPTx from "../mockData/XRPTx.json";
import * as resXRPStatus from "../mockData/XRPStatus.json";
import * as resXRPStatusAlt from "../mockData/XRPStatusAlt.json";

import * as resXRPBlock612 from "../mockData/XRPBlock612.json";
import * as resXRPBlock613 from "../mockData/XRPBlock613.json";
import * as resXRPBlock614 from "../mockData/XRPBlock614.json";

import * as resLTCBlock420 from "../mockData/LTCBlock420.json";
import * as resLTCBlock421 from "../mockData/LTCBlock421.json";

import * as resLTCBlockHeader from "../mockData/LTCBlockHeaderFake.json";

import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";

export const TestBlockBTC = new UtxoBlock(resBTCBlock);
export const TestTxBTC = new UtxoTransaction(resBTCTx);
export const TestBlockBTCAlt = new UtxoBlock(resBTCBlockAlt as unknown as IUtxoGetBlockRes);
export const TestTxBTCAlt = new UtxoTransaction(resBTCTxAlt);
export const TestTxBTCFake = new UtxoTransaction(resBTCTxFake);

export const TestBlockDOGE = new UtxoBlock(resDOGEBlock as unknown as IUtxoGetBlockRes);

export const TestBlockXRP = new XrpBlock(resXRPBlock as unknown as IXrpGetBlockRes);
export const TestTxXRP = new XrpTransaction(resXRPTx as unknown as IXrpGetTransactionRes);

export const TestBlockXRPAlt = new XrpBlock(resXRPBlockAlt as unknown as IXrpGetBlockRes);
export const TestBlockXRPFake = new XrpBlock(resXRPBlockFake as unknown as IXrpGetBlockRes);

export const BlockXRP612 = new XrpBlock(resXRPBlock612 as unknown as IXrpGetBlockRes);
export const BlockXRP613 = new XrpBlock(resXRPBlock613 as unknown as IXrpGetBlockRes);
export const BlockXRP614 = new XrpBlock(resXRPBlock614 as unknown as IXrpGetBlockRes);

export const BlockLTC420 = new UtxoBlock(resLTCBlock420);
export const BlockLTC421 = new UtxoBlock(resLTCBlock421);

export const BlockHeaderLTC = new LtcBlockHeader(resLTCBlockHeader);

export const AugTestBlockBTC = augmentBlock(DBBlockBTC, TestBlockBTC);
export const AugTestBlockBTCAlt = augmentBlock(DBBlockBTC, TestBlockBTCAlt);

export const TestXRPStatus = new XrpNodeStatus(resXRPStatus as any);
export const TestXRPStatusAlt = new XrpNodeStatus(resXRPStatusAlt as any);
const waitTx = async (tx) => {
  return tx;
};

export const promAugTxBTC0 = augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, TestBlockBTC, waitTx(TestTxBTC));
export const promAugTxBTC1 = augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, TestBlockBTC, waitTx(TestTxBTC));
export const promAugTxBTCAlt0 = augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, TestBlockBTCAlt, waitTx(TestTxBTCAlt));
export const promAugTxBTCAlt1 = augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, TestBlockBTCAlt, waitTx(TestTxBTCAlt));
