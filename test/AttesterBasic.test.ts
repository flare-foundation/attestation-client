import { ChainType } from "flare-mcc/dist/types";
import { AttesterClientChain } from "../lib/attester/AttesterClientChain";
import { ChainManager } from "../lib/chain/ChainManager";
import { ChainNode } from "../lib/chain/ChainNode";
import { getGlobalLogger } from "../lib/utils/logger";


// todo test: test per second limiter
// todo test: test queue limiter

describe("Attester Basic Tests", () => {
  describe("General functionalities", () => {
    it("basic validate transaction", async () => {
      const chainManager = new ChainManager(getGlobalLogger());

      //const chain = new ChainNode(chainManager, "XRP", ChainType.XRP, "http://s1.ripple.com:1151234/", "", "", "");
      const chain = new ChainNode(chainManager, "XRP", ChainType.XRP, "https://xrplcluster.com", new AttesterClientChain());

      assert(await chain.isHealthy());

      chainManager.addNode( ChainType.XRP, chain );

      //chainManager.validateTransaction(ChainType.XRP, 0, 1, "0x2BE5EA966817B0BF4E3F66711C979A4B4C88E0EBF99D836505FFA06DC49BA71D", null );
      for (let a = 100; a < 110; a++) {
        // chainManager.validateTransaction(ChainType.XRP, 0, a, "0x2BE5EA966817B0BF4E3F66711C979A4B4C88E0EBF99D836505FFA06DC49BA" + a.toString(), null);
      }
    });
  });
});
