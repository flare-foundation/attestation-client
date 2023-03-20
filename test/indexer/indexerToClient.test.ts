import { MCC, XrpMccCreate } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { setRetryFailureCallback } from "../../src/utils/helpers/promiseTimeout";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

describe(`Indexer to client (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  setRetryFailureCallback(getGlobalLogger().error);

  afterEach(function () {
    sinon.restore();
  });

  describe(`XRP`, function () {
    const XRPMccConnection = {
      url: "https://xrplcluster.com",
    } as XrpMccCreate;

    const client = new MCC.XRP(XRPMccConnection);
    let inToCl = new IndexerToClient(client, 1500, 2, 300);

    it("Should get block", async function () {
      let res = await inToCl.getBlockFromClient("height", 76_468_242);
      expect(res.blockHash).to.be.eq("55DBD6F6E00327DB99178A4416643C0BC47DBF1783E305DC70820037F804F3B7");
    });

    it("Should get blockHeader", async function () {
      let res = await inToCl.getBlockFromClient("height", 76_468_242);
      expect(res.blockHash).to.be.eq("55DBD6F6E00327DB99178A4416643C0BC47DBF1783E305DC70820037F804F3B7");
    });

    // Produces too long trace
    it("Should not get Block", async function () {
      sinon.stub(console, "error");
      sinon.stub(console, "log");

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

    describe("Null returns should call failure callback", function () {
      afterEach(function () {
        sinon.restore();
      });

      it("getBlockFromClient", async function () {
        const stub1 = sinon.stub(inToCl.client, "getBlock").resolves(null);
        const stub2 = sinon.stub(inToCl.client, "getBlockHeader").resolves(null);
        const mock = sinon.mock();
        setRetryFailureCallback(mock);

        const res = await inToCl.getBlockFromClient("null", -1);

        expect(res).to.be.null;
        expect(mock.callCount).to.eq(1);
      });

      it("getBlockHeaderFromClient", async function () {
        const stub1 = sinon.stub(inToCl.client, "getBlock").resolves(null);
        const stub2 = sinon.stub(inToCl.client, "getBlockHeader").resolves(null);
        const mock = sinon.mock();
        setRetryFailureCallback(mock);

        const res = await inToCl.getBlockHeaderFromClient("null", -1);

        expect(res).to.be.null;
        expect(mock.callCount).to.eq(1);
      });

      it("getBlockFromClientByHash", async function () {
        const stub1 = sinon.stub(inToCl.client, "getBlock").resolves(null);
        const stub2 = sinon.stub(inToCl.client, "getBlockHeader").resolves(null);
        const mock = sinon.mock();
        setRetryFailureCallback(mock);

        const res = await inToCl.getBlockFromClientByHash("null", "AA");

        expect(res).to.be.null;
        expect(mock.callCount).to.eq(1);
      });

      it("getBlockHeaderFromClientByHash", async function () {
        const stub1 = sinon.stub(inToCl.client, "getBlock").resolves(null);
        const stub2 = sinon.stub(inToCl.client, "getBlockHeader").resolves(null);
        const mock = sinon.mock();
        setRetryFailureCallback(mock);

        const res = await inToCl.getBlockHeaderFromClientByHash("null", "AA");

        expect(res).to.be.null;
        expect(mock.callCount).to.eq(1);
      });
    });
  });
});
