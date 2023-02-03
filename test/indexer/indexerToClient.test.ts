import { MCC, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;

//To be eventually mocked

describe(`Indexer to client (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  describe.skip("BTC", function () {
    const BtcMccConnection = {
      url: process.env.BTC_URL || "",
      username: process.env.BTC_USERNAME || "",
      password: process.env.BTC_PASSWORD || "",
    } as UtxoMccCreate;

    initializeTestGlobalLogger();

    const client = new MCC.BTC(BtcMccConnection);
    let inToCl = new IndexerToClient(client, 1800, 3, 300);

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

  describe(`XRP`, function () {
    const XRPMccConnection = {
      url: "https://xrplcluster.com",
      username: "",
      password: "",
    } as XrpMccCreate;

    const client = new MCC.XRP(XRPMccConnection);
    let inToCl = new IndexerToClient(client, 1500, 2, 300);

    it("Should get block", async function () {
      let res = await inToCl.getBlockFromClient("height", 76_468_242);
      expect(res.blockHash).to.be.eq("55DBD6F6E00327DB99178A4416643C0BC47DBF1783E305DC70820037F804F3B7");
    });

    // Should be fixed. Produces too long trace
    it.skip("Should not get Block", async function () {
      await expect(inToCl.getBlockFromClient("something", -1)).to.be.rejected;
    });

    it("Should get block by hash", async function () {
      const hash = "55DBD6F6E00327DB99178A4416643C0BC47DBF1783E305DC70820037F804F3B7";
      let res = await inToCl.getBlockFromClientByHash("hash", hash);
      expect(res.number).to.eq(76_468_242);
    });

    it("Should get block header by hash", async function () {
      const hash = "55DBD6F6E00327DB99178A4416643C0BC47DBF1783E305DC70820037F804F3B7";
      let res = await inToCl.getBlockHeaderFromClientByHash("hash", hash);
      expect(res.number).to.eq(76_468_242);
    });

    it("Should get block height", async function () {
      let res = await inToCl.getBlockHeightFromClient("height");
      expect(res).to.be.greaterThan(76_468_242);
    });

    it("Should get bottom block height", async function () {
      let res = await inToCl.getBottomBlockHeightFromClient("bottom");
      expect(res).to.be.eq(32570);
    });

    it("Should get block timestamp", async function () {
      let res = await inToCl.getBlockNumberTimestampFromClient(76_468_242);
      expect(res).to.be.eq(1671199631);
    });
  });
});
