// yarn test test/indexer/blockHeaderCollector.test.ts

import { HeaderCollector } from "../../lib/indexer/headerCollector";

const chai = require("chai");
const expect = chai.expect;
const fs = require("fs");
chai.use(require("chai-as-promised"));

describe(`Header Collector`, async () => {
  it("Cashing test", async function () {
    expect("a").to.eq("a");
  });
});
