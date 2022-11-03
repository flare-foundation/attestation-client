import { IBlock, MCC, UtxoBlock, UtxoMccCreate } from "@flarenetwork/mcc";
import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { Indexer } from "../../lib/indexer/indexer";
import { ChainType } from "@flarenetwork/mcc";
import { IndexerConfiguration } from "../../lib/indexer/IndexerConfiguration";
import { ChainConfiguration } from "../../lib/chain/ChainConfiguration";
import { expect } from "chai";

//to be changed
const BtcMccConnection = {
  url: "https://bitcoin-api.flare.network",
  username: "public",
  password: "d681co1pe2l3wcj9adrm2orlk0j5r5gr3wghgxt58tvge594co0k1ciljxq9glei",
} as UtxoMccCreate;

describe("augmentBlock", () => {
  let MccClient: MCC.BTC;
  let indexer: Indexer;
  indexer = new Indexer(null, null, null, null);
  let blockHash = "00000000000000000003a4ab93c83783974a86dc73d7e2499420c7eef132eaea";
  indexer.chainType = ChainType.BTC;
  indexer.chainConfig = new ChainConfiguration();
  indexer.chainConfig.name = "BTC";
  indexer.config = new IndexerConfiguration();
  indexer.prepareTables();

  it("Should create entity for a block", async () => {
    MccClient = new MCC.BTC(BtcMccConnection);
    let block = await MccClient.getBlock(blockHash);
    const augBlock = await augmentBlock(indexer, block);
    expect(augBlock.blockNumber).to.equal(729_410);
  });
});
