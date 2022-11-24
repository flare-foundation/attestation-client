import { DelayedExecution, LimitingProcessor } from "../../lib/caching/LimitingProcessor";
import { sleepms } from "../../lib/utils/utils";
import { expect, assert, should } from "chai";
import { DatabaseConnectOptions, DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { globalTestLogger } from "../../lib/utils/logger";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { ChainType, UtxoMccCreate } from "@flarenetwork/mcc";
import { Interlacing } from "../../lib/indexer/interlacing";
import sinon from "sinon";

describe("Delayed execution", () => {
  async function testFunc() {
    await sleepms(10);
    return "Succes";
  }

  async function testFuncFail() {
    await sleepms(10);
    throw "Fail";
  }

  let results = [];

  const delayedExecution = new DelayedExecution(
    testFunc,
    (res) => {
      results.push({ result: res, passed: 1 });
    },
    (res) => {
      results.push({ result: res, passed: -1 });
    }
  );

  const delayedExecutionFail = new DelayedExecution(
    testFuncFail,
    (res) => {
      results.push({ result: res, passed: 1 });
    },
    (res) => {
      results.push({ result: res, passed: -1 });
    }
  );

  it("Should create a DelayedExecution", () => {
    expect(delayedExecution).not.to.be.undefined;
  });

  it("Should run a DelayedExecution", async () => {
    await delayedExecution.run();
    expect(results[0]).to.be.deep.equal({ result: "Succes", passed: 1 });
  });

  it("Should catch an error DelayedExecution", async () => {
    await delayedExecutionFail.run();
    expect(results[1]).to.be.deep.equal({ result: "Fail", passed: -1 });
  });
});

describe("Limiting Processor", () => {
  const databaseConnectOptions = new DatabaseSourceOptions();
  databaseConnectOptions.database = process.env.DATABASE_NAME1;
  databaseConnectOptions.username = process.env.DATABASE_USERNAME;
  databaseConnectOptions.password = process.env.DATBASE_PASS;
  const dataService = new DatabaseService(globalTestLogger, databaseConnectOptions);

  const BtcMccConnection = {
    url: "https://bitcoin-api.flare.network",
    username: "public",
    password: "d681co1pe2l3wcj9adrm2orlk0j5r5gr3wghgxt58tvge594co0k1ciljxq9glei",
  } as UtxoMccCreate;

  let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
    transactionCacheSize: 2,
    blockCacheSize: 2,
    cleanupChunkSize: 2,
    activeLimit: 1,
    clientConfig: BtcMccConnection,
  };

  const interlacing = new Interlacing();
  let limitingProcessor: LimitingProcessor;
  const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);

  before(async () => {
    await interlacing.initialize(globalTestLogger, dataService, ChainType.BTC, 3600, 10);
    limitingProcessor = new LimitingProcessor(interlacing, cachedClient);
    limitingProcessor.settings.retry = 4;
  });

  it("Should create limitingProcessor", async () => {
    expect(limitingProcessor).to.not.be.undefined;
    expect(limitingProcessor.isActive).to.be.true;
  });

  it("Should ignore resume", async () => {
    let res = await limitingProcessor.resume();
    expect(res).to.be.undefined;
    expect(limitingProcessor.isActive).to.be.true;
  });

  it("Should pause", () => {
    limitingProcessor.pause();
    expect(limitingProcessor.isActive).to.be.false;
  });

  //Put tasks in queue then run processor and expect it to run tasks
  it.skip("Should call function and put it into the queue and call it after resume", function (done) {
    const preFake1 = sinon.fake();
    const preFake2 = sinon.fake();
    console.log("tu smo 0");
    limitingProcessor
      .call(preFake1)
      .then(() => {
        limitingProcessor.call(preFake2);
      })
      .then(() => {
        console.log("tu smo 1");
        expect(limitingProcessor.queue.size).to.be.eq(2);
      })
      .then(() => {
        expect(preFake1.callCount).to.be.eq(1);
        expect(preFake2.callCount).to.be.eq(1);
        console.log("tu smo2");
        done();
      })
      .catch((err) => done(err));
  });

  it("Should call and process while running", function () {
    expect(limitingProcessor.isCompleted).to.be.false;

    limitingProcessor.resume();

    expect(limitingProcessor.isActive).to.be.true;
    const firstFake = sinon.fake();
    const secondFake = sinon.fake();
    const thirdFake = sinon.fake();

    expect(limitingProcessor.isActive).to.be.true;
    return limitingProcessor
      .call(firstFake)
      .then(() => limitingProcessor.call(secondFake))
      .then(() => limitingProcessor.call(thirdFake, true))
      .then(() => expect(secondFake.callCount).to.be.equal(1))
      .then(() => expect(firstFake.callCount).to.be.equal(1))
      .then(() => expect(secondFake.calledAfter(thirdFake)).to.be.false);
  });

  it("Should destroy queue", async () => {
    limitingProcessor.pause();
    expect(limitingProcessor.isActive).to.be.false;
    limitingProcessor.call(() => {
      console.log("first");
      return "54321";
    }, true);
    expect(limitingProcessor.queue.size).to.be.eq(1);
    limitingProcessor.destroy();
    expect(limitingProcessor.queue.size).to.be.eq(0);
  });

  it("Should stop", async () => {
    limitingProcessor.stop();
    expect(limitingProcessor.isActive).to.be.false;
    expect(limitingProcessor.isCompleted).to.be.true;
  });
});

// describe("ucenje async", () => {
//   it("should do something", async function (done) {
//     function main(x) {
//       return new Promise((resolve) => {
//         console.log(3);
//         setTimeout(() => {
//           resolve(x);
//           console.log(5);
//         }, 2000);
//         console.log(4);
//       });
//     }
//     async function f(x) {
//       let r = main(x);
//       return r;
//     }
//     let d;
//     let c = f(15).then((res) => {
//       d = res;
//     });

//     setTimeout(() => {
//       console.log(d);
//     }, 3000);
//   });
// });
