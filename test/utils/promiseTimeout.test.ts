import { assert, expect } from "chai";
import PromiseTimeout = require("../../lib/utils/PromiseTimeout");
import sinon = require("sinon");
import { afterEach } from "mocha";
import loggers = require("../../lib/utils/logger");

describe("PromiseTimeout", function () {
  afterEach(function () {
    sinon.restore();
  });

  it("should execute default failureCallback", function () {
    const spy = sinon.spy(loggers, "getGlobalLogger");

    expect(() => PromiseTimeout.failureCallback("something")).to.throw("FailureCallbackNotSet");
    // assert(spy.called);
    assert(spy.called);
  });

  it("should setRetryFailureCallback", function () {
    const fake = sinon.fake();
    PromiseTimeout.setRetryFailureCallback(fake);
    PromiseTimeout.failureCallback("something");
    assert(fake.calledWith("something"));
  });

  it("should getRetryFailureCallback", function () {
    const fake = sinon.fake();
    PromiseTimeout.setRetryFailureCallback(fake);
    let result = PromiseTimeout.getRetryFailureCallback();
    expect(result).to.be.deep.eq(fake);
  });

  it("should safeCatch execute", function () {
    const fake = sinon.fake();
    PromiseTimeout.safeCatch("something alse", fake);
    assert(fake.called);
  });

  it("should safeCatch throw", function () {
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
