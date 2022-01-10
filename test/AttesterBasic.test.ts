import { ChainManager } from "../lib/ChainManager";
import { ChainNode } from "../lib/ChainNode";
import { ChainType } from "../lib/MCC/MCClientSettings";
import { getLogger } from "../lib/logger";

// todo test: test per second limiter
// todo test: test queue limiter

describe("Attester Basic Tests", () => {
  describe("General functionalities", () => {
    it("basic validate transaction", async () => {
      const chainManager = new ChainManager(getLogger());

      //const chain = new ChainNode(chainManager, "XRP", ChainType.XRP, "http://s1.ripple.com:1151234/", "", "", "");
      const chain = new ChainNode(chainManager, "XRP", ChainType.XRP, "https://xrplcluster.com", "", "", "");

      assert(await chain.isHealthy());

      chainManager.nodes.set(ChainType.XRP, chain);

      //chainManager.validateTransaction(ChainType.XRP, 0, 1, "0x2BE5EA966817B0BF4E3F66711C979A4B4C88E0EBF99D836505FFA06DC49BA71D", null );
      for (let a = 100; a < 110; a++) {
        // chainManager.validateTransaction(ChainType.XRP, 0, a, "0x2BE5EA966817B0BF4E3F66711C979A4B4C88E0EBF99D836505FFA06DC49BA" + a.toString(), null);
      }
    });
  });
});
