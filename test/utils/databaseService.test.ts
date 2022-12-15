import { DatabaseConnectOptions, DatabaseService } from "../../lib/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { getTestFile } from "../test-utils/test-utils";
import { expect } from "chai";

describe(`databaseService tests (${getTestFile(__filename)})`, function () {
  const databaseConnectOptions = new DatabaseConnectOptions();

  let dataService: DatabaseService;
  before(async function () {
    // initializeTestGlobalLogger();
    dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);
    await dataService.connect();
  });

  it("should be initialized", function () {
    expect(dataService.dataSource.isInitialized).to.be.true;
  });

  it("should get manager", function () {
    const mng = dataService.manager;
    expect(!mng).to.be.false;
  });
});
