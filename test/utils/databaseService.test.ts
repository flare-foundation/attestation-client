import { expect } from "chai";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

describe(`DatabaseService tests (${getTestFile(__filename)})`, function () {
  const databaseConnectOptions = new DatabaseConnectOptions();

  let dataService: DatabaseService;
  before(async function () {
    initializeTestGlobalLogger();
    dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);
    await dataService.connect();
  });

  it("Should be initialized", function () {
    expect(dataService.dataSource.isInitialized).to.be.true;
  });

  it("Should get manager", function () {
    const mng = dataService.manager;
    expect(!mng).to.be.false;
  });
});
