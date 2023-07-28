// yarn test test/caching/LimitingProcessor.test.ts

import { BtcFullBlock, ChainType, UtxoMccCreate } from "@flarenetwork/mcc";
import chai, { expect, assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import console from "console";
import sinon from "sinon";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../src/caching/CachedMccClient";
import { DelayedExecution, LimitingProcessor } from "../../src/caching/LimitingProcessor";
import { Interlacing } from "../../src/indexer/interlacing";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { sleepMs } from "../../src/utils/helpers/utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
chai.use(chaiAsPromised);

describe(`Limiting processor (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  describe("Delayed execution", () => {
    async function testFunc() {
      await sleepMs(10);
      return "Succes";
    }

    async function testFuncFail() {
      await sleepMs(10);
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
    const databaseConnectOptions = new DatabaseConnectOptions();
    const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

    const BtcMccConnection = {
      url: process.env.BTC_URL,
      username: process.env.BTC_USERNAME,
      password: process.env.BTC_PASSWORD,
    } as UtxoMccCreate;

    let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
      transactionCacheSize: 2,
      blockCacheSize: 2,
      cleanupChunkSize: 2,
      activeLimit: 1,
      clientConfig: BtcMccConnection,
    };

    const interlacing = new Interlacing();
    let limitingProcessor: LimitingProcessor<BtcFullBlock>;
    const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);

    before(async () => {
      initializeTestGlobalLogger();
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
      limitingProcessor = new LimitingProcessor(cachedClient);
      limitingProcessor.settings.retry = 4;
    });

    afterEach(() => {
      sinon.restore();
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

    it("Should registerTopLevelJob", () => {
      limitingProcessor.registerTopLevelJob();
      expect(limitingProcessor.topLevelJobsCounter).to.be.eq(1);
    });

    it("Should markTopLevelJobDone", () => {
      limitingProcessor.markTopLevelJobDone();
      expect(limitingProcessor.topLevelJobsDoneCounter).to.be.eq(1);
    });

    it("Should call function and put it into the queue and call it after resume", function (done) {
      const preFake1 = sinon.fake();
      const preFake2 = sinon.fake();

      //expect limiting processor to be inactive
      expect(limitingProcessor.isActive).to.eq(false);

      //call two tasks
      limitingProcessor.call(preFake1).catch((e) => getGlobalLogger().error("Limiting processor call failed"));
      limitingProcessor
        .call(preFake2)
        .then(() => {
          //expect both of the task to be waiting
          expect(limitingProcessor.queue.size).to.eq(2);
        })
        .catch((e) => getGlobalLogger().error("Limiting processor call failed"));
      //resume the processor
      limitingProcessor.resume().catch((e) => getGlobalLogger().error("Limiting processor resume failed"));

      //with for the tasks to be done and expect first task to be done first
      sleepMs(100)
        .then(() => {
          expect(preFake1.callCount).to.be.eq(1);
          expect(preFake2.callCount).to.be.eq(1);
          expect(preFake2.calledAfter(preFake1)).to.be.true;
          done();
        })
        .catch((err) => done(err));
    });

    it("Should call function and prepand it into the queue and call it after resume", function (done) {
      const preFake1 = sinon.fake();
      const preFake2 = sinon.fake();

      limitingProcessor.pause();
      //expect limiting processor to be inactive
      expect(limitingProcessor.isActive).to.eq(false);

      //call two tasks
      limitingProcessor.call(preFake1);
      limitingProcessor.call(preFake2, true).then(() => {
        //expect both of the task to be waiting
        expect(limitingProcessor.queue.size).to.eq(2);
      });
      //resume the processor
      limitingProcessor.resume().catch((e) => getGlobalLogger().error("Limiting processor resume failed"));

      //with for the tasks to be done and expect first task to be done first
      sleepMs(100)
        .then(() => {
          expect(preFake1.callCount).to.be.eq(1);
          expect(preFake2.callCount).to.be.eq(1);
          expect(preFake1.calledAfter(preFake2)).to.be.true;
          done();
        })
        .catch((err) => done(err));
    });

    it("Should call and process while running with debug on", function (done) {
      expect(limitingProcessor.isCompleted).to.be.false;

      limitingProcessor.resume(true).catch((e) => getGlobalLogger().error("Limiting processor resume failed"));

      expect(limitingProcessor.isActive).to.be.true;
      const firstFake = sinon.fake();
      const secondFake = sinon.fake();
      const thirdFake = sinon.fake();

      expect(limitingProcessor.isActive).to.be.true;
      limitingProcessor.debugOn();
      limitingProcessor
        .call(firstFake)
        .then(() => limitingProcessor.call(secondFake))
        .then(() => limitingProcessor.call(thirdFake, true))
        .then(() => sleepMs(300))
        .then(() => {
          expect(secondFake.callCount).to.be.equal(1);
          expect(firstFake.callCount).to.be.equal(1);
          expect(secondFake.calledAfter(thirdFake)).to.be.false;
          done();
        })
        .catch((err) => done(err));
    });

    it("Should ignore undefined tasks", function (done) {
      const spy = sinon.spy(getGlobalLogger(), "error2");
      expect(limitingProcessor.isActive).to.eq(true);
      limitingProcessor.queue.push(null);
      sleepMs(200)
        .then(() => {
          expect(spy.calledWith(`LimitingProcessor::continue error: de is undefined`)).to.be.true;
          done();
        })
        .catch((err) => done(err));
    });

    it("Should destroy queue", async () => {
      limitingProcessor.pause();
      expect(limitingProcessor.isActive).to.be.false;
      limitingProcessor
        .call(() => {
          return "54321";
        }, true)
        .catch((e) => getGlobalLogger().error("Limiting processor call failed"));
      expect(limitingProcessor.queue.size).to.be.eq(1);
      limitingProcessor.destroy();
      expect(limitingProcessor.queue.size).to.be.eq(0);
    });

    it("Should stop", async () => {
      limitingProcessor.stop();
      expect(limitingProcessor.isActive).to.be.false;
      expect(limitingProcessor.isCompleted).to.be.true;
    });

    // crashes
    it("Should initializeJobs throw an error", async function () {
      sinon.stub(console, "error");
      sinon.stub(console, "log");

      await expect(limitingProcessor.initializeJobs(null, null)).to.be.rejected;
    });

    describe("Debug", function () {
      it("Should show debug info", function () {
        sinon.stub(console, "error");
        sinon.stub(console, "log");

        limitingProcessor.debugInfo();
      });

      it("Should turn debug off", function () {
        limitingProcessor.debugOff();
      });

      it("Should turn debug on", function () {
        limitingProcessor.debugOn();
      });

      it("Should turn debug off", function () {
        limitingProcessor.debugOff();
      });
    });
  });
});
