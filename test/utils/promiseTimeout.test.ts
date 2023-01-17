// yarn test test/utils/promiseTimeout.test.ts

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;
import sinon = require("sinon");
import loggers = require("../../lib/utils/logger");
import { sleepMs } from "@flarenetwork/mcc";
import { getTestFile } from "../test-utils/test-utils";
import { retry, failureCallback, getRetryFailureCallback, safeCatch, setRetryFailureCallback } from "../../lib/utils/PromiseTimeout";

chai.should();
describe(`PromiseTimeout  ${getTestFile(__filename)})`, function () {
  loggers.initializeTestGlobalLogger();
  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    setRetryFailureCallback((string) => {});
  });

  it("Should execute on null failureCallback", function () {
    const spy = sinon.spy(loggers, "getGlobalLogger");
    setRetryFailureCallback(null);

    expect(() => failureCallback("something")).to.throw("FailureCallbackNotSet");
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

  //Problematic, OK run as a single test, fails in coverage
  it("Should retry fail", async function () {
    const fake = sinon.fake();
    const fake1 = sinon.fake();
    let fake2 = sinon.stub();
    fake2.rejects("fail");

    setRetryFailureCallback(fake);

    return expect(retry("fail test", fake2, 300, 2, 500)).to.be.eventually.rejectedWith("fail");
  });

  it("Should retry sleep", async function () {
    async function testError() {
      await sleepMs(100000);
      return 12;
    }

    setRetryFailureCallback((label) => {});

    return expect(retry("sleep test", testError, 2, 2, 2)).to.be.eventually.rejectedWith();
  });

  it("Should safeCatch execute", function () {
    const fake = sinon.fake();
    safeCatch("something alse", fake);
    assert(fake.called);
  });

  it("Should safeCatch throw", function () {
    const stub = sinon.stub(loggers, "logException");
    function fake1() {
      throw new Error("wrong");
    }

    safeCatch("something else", fake1);
    assert(stub.calledOnce);
  });
});
