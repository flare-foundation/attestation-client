import { ChainType, UtxoBlock, UtxoTransaction } from "@flarenetwork/mcc";
import { DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { augmentTransactionUtxo } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
import { PreparedBlock } from "../../lib/indexer/preparedBlock";
import { assert, expect } from "chai";
import { getTestFile } from "../test-utils/test-utils";

describe(`PreparedBlock, (${getTestFile(__filename)})`, function () {
  const block = new UtxoBlock(resBTCBlock);
  const tx = new UtxoTransaction(resBTCTx);

  let augTx0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  const augBlock = augmentBlock(DBBlockBTC, block);
  before(async () => {
    const waitTx = async (tx) => {
      return tx;
    };

    augTx0 = await augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, block, waitTx(tx));
    augTx1 = await augmentTransactionUtxo(DBTransactionBTC1, ChainType.BTC, block, waitTx(tx));
  });

  it("Should construct preparedBlock", function () {
    let preparedBlocks = new PreparedBlock(augBlock, [augTx0, augTx1]);
    assert(preparedBlocks.block instanceof DBBlockBTC);
    expect(preparedBlocks.transactions.length).to.be.eq(2);
  });
});
