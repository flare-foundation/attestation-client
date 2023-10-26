// yarn test test/indexer/preparedBlock.test.ts

import { BtcBlock, BtcTransaction, ChainType } from "@flarenetwork/mcc";
import { assert, expect } from "chai";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBTC0, DBTransactionBTC1, DBTransactionBase } from "../../src/entity/indexer/dbTransaction";
import { augmentBlock } from "../../src/indexer/chain-collector-helpers/augmentBlock";
import { augmentTransactionUtxo } from "../../src/indexer/chain-collector-helpers/augmentTransaction";
import { PreparedBlock } from "../../src/indexer/preparedBlock";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import { getTestFile } from "../test-utils/test-utils";

describe(`PreparedBlock, (${getTestFile(__filename)})`, function () {
  const block = new BtcBlock(resBTCBlock);
  const tx = new BtcTransaction(resBTCTx);

  let augTx0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  const augBlock = augmentBlock(DBBlockBTC, block);
  before(async () => {
    augTx0 = augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, block, tx);
    augTx1 = augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, block, tx);
  });

  it("Should construct preparedBlock", function () {
    let preparedBlocks = new PreparedBlock(augBlock, [augTx0, augTx1]);
    assert(preparedBlocks.block instanceof DBBlockBTC);
    expect(preparedBlocks.transactions.length).to.be.eq(2);
  });
});
