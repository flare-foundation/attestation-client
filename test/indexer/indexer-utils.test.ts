const sinon = require("sinon");
import { criticalAsync } from "../../lib/indexer/indexer-utils";
import { expect } from "chai";
const proxi = require("../../lib/utils/PromiseTimeout");

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

    console.log("start");
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

    function fakeOnFailur(str: string) {}

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
