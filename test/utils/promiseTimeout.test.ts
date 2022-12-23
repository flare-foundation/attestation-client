const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;
import PromiseTimeout = require("../../src/utils/PromiseTimeout");
import sinon = require("sinon");
import { afterEach } from "mocha";
import loggers = require("../../src/utils/logger");
import { sleepMs } from "@flarenetwork/mcc";
import { getTestFile } from "../test-utils/test-utils";

chai.should();
describe(`PromiseTimeout  ${getTestFile(__filename)})`, function () {
  loggers.initializeTestGlobalLogger();
  afterEach(function () {
    sinon.restore();
  });

  it("Should execute on null failureCallback", function () {
    const spy = sinon.spy(loggers, "getGlobalLogger");
    PromiseTimeout.setRetryFailureCallback(null);

    expect(() => PromiseTimeout.failureCallback("something")).to.throw("FailureCallbackNotSet");
    // assert(spy.called);
    assert(spy.called);
  });

  it("Should setRetryFailureCallback", function () {
    const fake = sinon.fake();
    PromiseTimeout.setRetryFailureCallback(fake);
    PromiseTimeout.failureCallback("something");
    assert(fake.calledWith("something"));
  });

  it("Should getRetryFailureCallback", function () {
    const fake = sinon.fake();
    PromiseTimeout.setRetryFailureCallback(fake);
    let result = PromiseTimeout.getRetryFailureCallback();
    expect(result).to.be.deep.eq(fake);
  });

  it("Should retry", async function () {
    const fake = sinon.stub();
    fake.onFirstCall().throws("wait");
    fake.onSecondCall().returns(3);

    let res = await PromiseTimeout.retry("fake", fake, 6000, 3, 1000);
    expect(res).to.eq(3);
  });

  it("Should retry fail", async function () {
    async function testError() {
      await sleepMs(10);
      throw "fail";
    }

    PromiseTimeout.setRetryFailureCallback((label) => {});

    await expect(PromiseTimeout.retry("fail test", testError, 300, 2, 500)).to.be.rejectedWith("fail");
  });

  // Needs further inspection
  it("Should retry sleep", async function () {
    async function testError() {
      await sleepMs(100000);
      return 12;
    }

    PromiseTimeout.setRetryFailureCallback((label) => {});

    await expect(PromiseTimeout.retry("sleep test", testError, 2, 2, 2)).to.be.rejected;
  });

  it("Should safeCatch execute", function () {
    const fake = sinon.fake();
    PromiseTimeout.safeCatch("something alse", fake);
    assert(fake.called);
  });

  it("Should safeCatch throw", function () {
    // const fake = sinon.fake.throws(new Error("wrong"));

    const stub = sinon.stub(loggers, "logException");
    function fake1() {
      throw new Error("wrong");
    }

    PromiseTimeout.safeCatch("something else", fake1);
    assert(stub.calledOnce);
    // expect(testObject).to.throw;
    // assert(spy.called);
  });
});
