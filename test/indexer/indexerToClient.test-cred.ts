import { MCC, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { initializeTestGlobalLogger } from "../../src/utils/logger";
import { getTestFile } from "../test-utils/test-utils";
const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;

//To be eventually mocked

describe(`Indexer to client with credentials(${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();
  describe("BTC", function () {
    const BtcMccConnection = {
      url: "https://bitcoin-api.flare.network",
      username: "public",
      password: "",
    } as UtxoMccCreate;

    initializeTestGlobalLogger();

    const client = new MCC.BTC(BtcMccConnection);
    let inToCl = new IndexerToClient(client, 1500, 2, 300);

    it("Should get block", async function () {
      let res = await inToCl.getBlockFromClient("height", 763418);
      expect(res.blockHash).to.be.eq("0000000000000000000275e5d4097fb6121787976f42e85310976b34b1e36072");
    });

    it("Should not get Block", async function () {
      await expect(inToCl.getBlockFromClient("something", -1)).to.be.rejected;
    });

    it("Should get block by hash", async function () {
      const hash = "0000000000000000000337e6d093c2ca249b4a94c1edf25109d140391fcfefff";
      let res = await inToCl.getBlockFromClientByHash("hash", hash);
      expect(res.number).to.eq(763419);
    });

    it("Should get block header by hash", async function () {
      const hash = "0000000000000000000337e6d093c2ca249b4a94c1edf25109d140391fcfefff";
      let res = await inToCl.getBlockHeaderFromClientByHash("hash", hash);
      expect(res.number).to.eq(763419);
    });

    it("Should get block height", async function () {
      let res = await inToCl.getBlockHeightFromClient("height");
      expect(res).to.be.greaterThan(763419);
    });

    it("Should get bottom block height", async function () {
      let res = await inToCl.getBottomBlockHeightFromClient("bottom");
      expect(res).to.be.eq(0);
    });

    it("Should get block timestamp", async function () {
      let res = await inToCl.getBlockNumberTimestampFromClient(763419);
      expect(res).to.be.eq(1668598940);
    });
  });
});
