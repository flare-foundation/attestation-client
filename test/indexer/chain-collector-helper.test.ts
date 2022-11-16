import { IXrpGetBlockRes, IXrpGetTransactionRes, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction, xrp_ensure_data } from "@flarenetwork/mcc";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import { augmentTransactionUtxo, augmentTransactionXrp } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import { DBTransactionBTC0 } from "../../lib/entity/indexer/dbTransaction";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import * as resXRPBlock from "../mockData/XRPBlock.json";
import * as resXRPTx from "../mockData/XRPTx.json";

describe("augmentBlock", () => {
  it("Should create entity for a block", async () => {
    const block = new UtxoBlock(resBTCBlock);
    const augBlock = augmentBlock(DBBlockBTC, block);
    expect(augBlock.blockNumber).to.equal(729_410);
  });
});

describe("augmentTransaction", () => {
  it("Should create entity from a transaction for BTC", async () => {
    const block = new UtxoBlock(resBTCBlock);
    const tx = new UtxoTransaction(resBTCTx);
    const waitTx = async () => {
      return tx;
    };

    const augTx = await augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, block, waitTx());
    expect(augTx.blockNumber).to.be.eq(729_410);
    expect(augTx.transactionId).to.be.eq("b39d8e733bf9f874c7c82019d41b6df1c829f3988694adf5ebdadb1590832225");
  });

  it("Should create entity from a transaction for XRP", async () => {
    const txHash = "A8B4D5C887D0881881A0A45ECEB8D250BF53E6CAE9EB72B9D251C590BD9087AB";
    const blockId = 75660711;
    xrp_ensure_data(resXRPTx);
    const block = new XrpBlock(resXRPBlock as unknown as IXrpGetBlockRes);

    const tx = new XrpTransaction(resXRPTx as unknown as IXrpGetTransactionRes);

    const augTx = augmentTransactionXrp(DBTransactionBTC0, block, tx);
    expect(augTx.blockNumber).to.be.eq(blockId);
    expect(augTx.transactionId).to.be.eq(txHash);
    // });
  });
});
