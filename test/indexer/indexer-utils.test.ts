import { ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import sinon from "sinon";
import { DBBlockBase } from "../../src/entity/indexer/dbBlock";
import { criticalAsync, getChainN, getStateEntry, getStateEntryString, prepareIndexerTables } from "../../src/indexer/indexer-utils";
import * as proxi from "../../src/utils/helpers/promiseTimeout";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

describe(`Indexer utils (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  describe("prepareIndexerTables", function () {
    it("Should throw for invalid chain type", function () {
      expect(() => prepareIndexerTables(ChainType.invalid)).to.throw("Invalid chain type");
    });

    for (let j of [ChainType.BTC, ChainType.XRP]) {
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

    it("Should call function", function () {
      async function testFunction() {
        return 15;
      }
      var fake = sinon.fake(testFunction);

      return criticalAsync("test", fake).then(() => {
        expect(fake.callCount).to.be.eq(1);
      });
    });

    it("Should exit", function () {
      async function testFailFunction() {
        throw 12;
      }

      var stub1 = sinon.stub(process, "exit");
      var stub2 = sinon.stub(proxi, "getRetryFailureCallback").returns(null);

      return criticalAsync("test", testFailFunction).then(() => expect(stub1.called).to.be.true);
    });

    it("Should manage error", function () {
      sinon.restore();

      async function testFailFunction() {
        throw 12;
      }

      function fakeOnFailur(str: string) { }

      var stub2 = sinon.stub(proxi, "getRetryFailureCallback").returns(fakeOnFailur);

      return criticalAsync("test", testFailFunction).then(() => {
        expect(stub2.called).to.be.true;
      });
    });
  });

  describe("Misc utils", function () {
    it("Should getStateEntry", function () {
      let res = getStateEntry("first", "second", 14);
      expect(res.name).to.be.eq("second_first");
      expect(res.valueNumber).to.be.eq(14);
      expect(res.timestamp).to.be.greaterThan(10);
    });

    it("Should getStateEntryString #1", function () {
      let res = getStateEntryString("first", "second", "third", 15);
      expect(res.name).to.be.eq("second_first");
      expect(res.valueNumber).to.be.eq(15);
      expect(res.valueString).to.be.eq("third");
      expect(res.timestamp).to.be.greaterThan(10);
      expect(res.comment).to.be.eq("");
    });

    it("Should getStateEntryString #2", function () {
      let res = getStateEntryString("first", "second", "third", 15, "fourth");
      expect(res.name).to.be.eq("second_first");
      expect(res.valueNumber).to.be.eq(15);
      expect(res.valueString).to.be.eq("third");
      expect(res.timestamp).to.be.greaterThan(10);
      expect(res.comment).to.be.eq("fourth");
    });

    it("Should getChainN", function () {
      let res = getChainN("second");
      expect(res).to.be.eq("second_N");
    });
  });
});
