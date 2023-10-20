import {
  BtcBlockHeader,
  BtcFullBlock,
  BtcTransaction,
  ChainType,
  DogeFullBlock,
  IUtxoGetBlockRes,
  IUtxoGetTransactionRes,
  IXrpGetBlockRes,
  IXrpGetTransactionRes,
  XrpBlock,
  XrpFullBlock,
  XrpNodeStatus,
  XrpTransaction,
} from "@flarenetwork/mcc";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBTC0, DBTransactionBTC1 } from "../../src/entity/indexer/dbTransaction";
import { augmentBlock } from "../../src/indexer/chain-collector-helpers/augmentBlock";
import { augmentTransactionUtxo } from "../../src/indexer/chain-collector-helpers/augmentTransaction";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCBlockAlt from "../mockData/BTCBlockAlt.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import * as resBTCTxAlt from "../mockData/BTCTxAlt.json";
import * as resDOGEBlock from "../mockData/DOGEBlock.json";
import * as resXRPBlock from "../mockData/XRPBlock.json";
import * as resXRPBlockAlt from "../mockData/XRPBlockAlt.json";
import * as resXRPBlockFake from "../mockData/XRPBlockFake.json";
import * as resXRPStatus from "../mockData/XRPStatus.json";
import * as resXRPStatusAlt from "../mockData/XRPStatusAlt.json";
import * as resXRPTx from "../mockData/XRPTx.json";

import * as resXRPBlock612 from "../mockData/XRPBlock612.json";
import * as resXRPBlock613 from "../mockData/XRPBlock613.json";
import * as resXRPBlock614 from "../mockData/XRPBlock614.json";

import * as resLTCBlockHeader from "../mockData/LTCBlockHeaderFake.json";

export const TestBlockBTC = new BtcFullBlock(resBTCBlock as unknown as IUtxoGetBlockRes);
export const TestTxBTC = new BtcTransaction(resBTCTx as unknown as IUtxoGetTransactionRes);
export const TestBlockBTCAlt = new BtcFullBlock(resBTCBlockAlt as unknown as IUtxoGetBlockRes);
export const TestTxBTCAlt = new BtcTransaction(resBTCTxAlt as unknown as IUtxoGetTransactionRes);

export const TestBlockDOGE = new DogeFullBlock(resDOGEBlock as unknown as IUtxoGetBlockRes);

export const TestBlockXRP = new XrpBlock(resXRPBlock as unknown as IXrpGetBlockRes);
export const TestTxXRP = new XrpTransaction(resXRPTx as unknown as IXrpGetTransactionRes);

export const TestBlockXRPAlt = new XrpFullBlock(resXRPBlockAlt as unknown as IXrpGetBlockRes);
export const TestBlockXRPFake = new XrpFullBlock(resXRPBlockFake as unknown as IXrpGetBlockRes);

export const BlockXRP612 = new XrpBlock(resXRPBlock612 as unknown as IXrpGetBlockRes);
export const BlockXRP613 = new XrpBlock(resXRPBlock613 as unknown as IXrpGetBlockRes);
export const BlockXRP614 = new XrpBlock(resXRPBlock614 as unknown as IXrpGetBlockRes);

export const BlockHeaderBTC = new BtcBlockHeader(resLTCBlockHeader);

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
