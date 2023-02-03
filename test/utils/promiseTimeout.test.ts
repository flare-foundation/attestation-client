import { sleepMs } from "@flarenetwork/mcc";
import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { afterEach } from "mocha";
import sinon from "sinon";
import { failureCallback, getRetryFailureCallback, retry, safeCatch, setRetryFailureCallback } from "../../src/utils/helpers/promiseTimeout";
import * as loggers from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);
chai.should();
describe(`promiseTimeout  ${getTestFile(__filename)})`, function () {
  loggers.initializeTestGlobalLogger();
  afterEach(function () {
    sinon.restore();
  });

  it("Should execute on null failureCallback", function () {
    const spy = sinon.spy(loggers, "getGlobalLogger");
    setRetryFailureCallback(null);

    expect(() => failureCallback("something")).to.throw("FailureCallbackNotSet");
    // assert(spy.called);
    assert(spy.called);
  });

  it("Should setRetryFailureCallback", function () {
    const fake = sinon.fake();
    setRetryFailureCallback(fake);
    failureCallback("something");
    assert(fake.calledWith("something"));
  });

  it("Should getRetryFailureCallback", function () {
    const fake = sinon.fake();
    setRetryFailureCallback(fake);
    let result = getRetryFailureCallback();
    expect(result).to.be.deep.eq(fake);
  });

  it("Should retry", async function () {
    const fake = sinon.stub();
    fake.onFirstCall().throws("wait");
    fake.onSecondCall().returns(3);

    let res = await retry("fake", fake, 6000, 3, 1000);
    expect(res).to.eq(3);
  });

  it("Should retry fail", async function () {
    async function testError() {
      await sleepMs(10);
      throw "fail";
    }

    setRetryFailureCallback((label) => {});

    await expect(retry("fail test", testError, 300, 2, 500)).to.be.rejectedWith("fail");
  });

  // Needs further inspection
  it("Should retry sleep", async function () {
    async function testError() {
      await sleepMs(100000);
      return 12;
    }

    setRetryFailureCallback((label) => {});

    await expect(retry("sleep test", testError, 2, 2, 2)).to.be.rejected;
  });

  it("Should safeCatch execute", function () {
    const fake = sinon.fake();
    safeCatch("something alse", fake);
    assert(fake.called);
  });

  it("Should safeCatch throw", function () {
    // const fake = sinon.fake.throws(new Error("wrong"));

    const stub = sinon.stub(loggers, "logException");
    function fake1() {
      throw new Error("wrong");
    }

    safeCatch("something else", fake1);
    assert(stub.calledOnce);
    // expect(testObject).to.throw;
    // assert(spy.called);
  });
});
