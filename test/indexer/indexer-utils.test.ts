const sinon = require("sinon");
import { criticalAsync, getChainN, getStateEntry, getStateEntryString, prepareIndexerTables } from "../../lib/indexer/indexer-utils";
import { expect } from "chai";
import { ChainType } from "@flarenetwork/mcc";
import { DBBlockBase } from "../../lib/entity/indexer/dbBlock";
import { getTestFile } from "../test-utils/test-utils";
import { initializeTestGlobalLogger } from "../../lib/utils/logger";
const proxi = require("../../lib/utils/PromiseTimeout");

describe(`Indexer utils (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  describe("prepareIndexerTables", function () {
    it("should throw for invalid chain type", function () {
      expect(() => prepareIndexerTables(ChainType.invalid)).to.throw("Invalid chain type");
    });

    for (let j = 0; j < 5; j++) {
      it(`Should prepare IndexerTables for ${ChainType[j]}`, function () {
        let res = prepareIndexerTables(j);
        expect(res.transactionTable.length).to.equal(2);
        expect(new res.blockTable()).is.instanceof(DBBlockBase);
      });
    }
  });

  describe("critical async", function () {
    afterEach(function () {
      sinon.restore();
    });

    it("should call function", function () {
      const promise = sinon.promise() as Promise<any>;
      async function testFunction() {
        return 15;
      }
      var fake = sinon.fake(testFunction);

      return criticalAsync("test", fake).then(() => {
        expect(fake.callCount).to.be.eq(1);
      });
    });

    it("should exit", function () {
      sinon.restore();
      const promise = sinon.promise() as Promise<any>;
      async function testFailFunction() {
        throw 12;
      }
      const fake = sinon.fake();

      // var fake = sinon.fake(testFailFunction);
      var stub1 = sinon.stub(process, "exit").returns(null);
      var stub2 = sinon.stub(proxi, "getRetryFailureCallback").returns(null);

      // stub2.callsFake(pro);

      return criticalAsync("test", testFailFunction).then(() => expect(stub1.called).to.be.true);
    });

    it("should manage error", function () {
      sinon.restore();
      const promise = sinon.promise() as Promise<any>;
      async function testFailFunction() {
        throw 12;
      }
      const fake = sinon.fake();

      function fakeOnFailur(str: string) {}

      // var fake = sinon.fake(testFailFunction);
      // var stub1 = sinon.stub(process, "exit").returns(2);
      var stub2 = sinon.stub(proxi, "getRetryFailureCallback").returns(fakeOnFailur);

      // stub2.callsFake(pro);

      return criticalAsync("test", testFailFunction).then(() => {
        expect(stub2.called).to.be.true;
      });
    });
  });

  describe("Misc utils", function () {
    it("should getStateEntry", function () {
      let res = getStateEntry("first", "second", 14);
      expect(res.name).to.be.eq("second_first");
      expect(res.valueNumber).to.be.eq(14);
      expect(res.timestamp).to.be.greaterThan(10);
    });

    it("should getStateEntryString", function () {
      let res = getStateEntryString("first", "second", "third", 15, "fourth");
      expect(res.name).to.be.eq("second_first");
      expect(res.valueNumber).to.be.eq(15);
      expect(res.valueString).to.be.eq("third");
      expect(res.timestamp).to.be.greaterThan(10);
      expect(res.comment).to.be.eq("fourth");
    });

    it("should getChainN", function () {
      let res = getChainN("second");
      expect(res).to.be.eq("second_N");
    });
  });
});
