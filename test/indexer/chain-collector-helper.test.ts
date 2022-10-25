// import { IBlock, MCC, UtxoBlock, UtxoMccCreate } from "@flarenetwork/mcc";
// import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
// import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
// import { Indexer } from "../../lib/indexer/indexer";
// import { expect } from "chai";

// const BtcMccConnection = {
//   url: "https://bitcoin-api.flare.network",
//   username: "public",
//   password: "d681co1pe2l3wcj9adrm2orlk0j5r5gr3wghgxt58tvge594co0k1ciljxq9glei",
// } as UtxoMccCreate;

// describe("augmentBlock", () => {
//   let MccClient: MCC.BTC;
//   let indexer: Indexer;
//   let blockHash = "00000000000000000003a4ab93c83783974a86dc73d7e2499420c7eef132eaea";
//   let block: UtxoBlock;

//   it("Should create entity for a block", async () => {
//     indexer = new Indexer(null, null, null, null);
//     MccClient = new MCC.BTC(BtcMccConnection);
//     let block = await MccClient.getBlock(blockHash);
//     console.log(block);
//     console.log(block.number);
//     const augBlock = await augmentBlock(indexer, block);
//     console.log(augBlock);
//   });
// });
