// yarn test test/utils/credentials.test.ts
// yarn nyc yarn test test/utils/credentials.test.ts

import { assert } from "chai";
import sinon from "sinon";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { getCredentialsKey, getCredentialsKeyAddress, getSecretByAddress } from "../../src/utils/config/credentialsKey";
import { SECURE_MASTER_CONFIGS, _clearSecureCredentials } from "../../src/utils/config/jsonSecure";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AdditionalTypeInfo, IReflection } from "../../src/utils/reflection/reflection";
import { getTestFile } from "../test-utils/test-utils";

const TEST_PASSWORD = "t3stPassw0rd";

const SECURE_CONFIG_PATH = "test/utils/test-data/config/";

const CREDENTIALS_KEY = `direct:${TEST_PASSWORD}`;


let exitCode = 0;

class TestConfig implements IReflection<TestConfig> {
    key1: number = 0;
    key2: number = 0;
    key3: number = 0;
    key4: number = 0;

    instanciate() {
        return new TestConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
        return null;
    }

}

describe(`Test credentials utils (${getTestFile(__filename)})`, () => {

    before(async () => {
        initializeTestGlobalLogger();

        // Enable Test Logger display
        //TestLogger.setDisplay(1);

        sinon.stub(process, 'exit');

        (process.exit as any).callsFake((code) => {
            exitCode = code;
        });

    });

    beforeEach(async () => {
        process.env.SECURE_CONFIG_PATH = SECURE_CONFIG_PATH;
        process.env.FLARE_NETWORK = `TestNetwork`;
        process.env.CREDENTIALS_KEY = CREDENTIALS_KEY;

        exitCode = 0;

        _clearSecureCredentials();
    });

    after(() => {
        sinon.restore();
        _clearSecureCredentials();
        delete process.env.CREDENTIALS_KEY_FILE;
        delete process.env.SECURE_CONFIG_PATH;
        delete process.env.FLARE_NETWORK;
        delete process.env.CREDENTIALS_KEY;
    })

    // credentials

    it(`get credentials key address from env`, async () => {
        const credentialsPassword = await getCredentialsKeyAddress();

        assert(credentialsPassword == CREDENTIALS_KEY, "Credentials key not correct");

        assert(exitCode === 0, `exit called`);
    });

    it(`get credentials key address from file`, async () => {
        delete process.env.CREDENTIALS_KEY;
        process.env.CREDENTIALS_KEY_FILE = "test/utils/test-data/credentials.key";

        const credentialsPassword = await getCredentialsKeyAddress();

        assert(credentialsPassword == `test:address`, "Credentials key not correct");

        assert(exitCode === 0, `exit called`);
    });

    it.skip(`unable to get credentials key address from env or file`, async () => {
        delete process.env.CREDENTIALS_KEY;
        delete process.env.CREDENTIALS_KEY_FILE;

        const credentialsPassword = await getCredentialsKeyAddress();

        assert(exitCode !== 0, `should exit since there is no credentials key address`);
    });

    it(`get credentials invalid format`, async () => {
        const credentialsPassword = await getSecretByAddress("provider:address:invalid");

        assert(exitCode !== 0, `exit not called`);
    });

    it(`get credentials invalid address`, async () => {
        const credentialsPassword = await getSecretByAddress("unknown:some address");

        assert(exitCode !== 0, `exit not called`);
    });

    it(`get credentials key direct`, async () => {
        const credentialsPassword = await getCredentialsKey();

        assert(credentialsPassword === TEST_PASSWORD, `credentials password not correct`);

    });

    it(`get credentials key google cloud secret manager invalid name`, async () => {
        const credentialsPassword = await getSecretByAddress("GoogleCloudSecretManager:invalid name");

        assert(exitCode !== 0, `exit not called`);
    });

    it(`secure credentials read`, async () => {
        let testConfig = new TestConfig();

        const test = await readSecureConfig(testConfig, "template1");

        assert(test.key1 === 1, "incorrect config key");
        assert(test.key2 === 2, "incorrect config key");
        assert(test.key3 === 3, "incorrect config key");
        assert(test.key4 === 4, "incorrect config key");

        assert(exitCode === 0, `function must not exit`);
    });

    // For some reason this one causes VerifierRouter.test.ts to stuck
    // To be investigated
    it.skip(`test empty credentials at start`, async () => {
        let testConfig = new TestConfig();

        SECURE_MASTER_CONFIGS.push(["dummy", 123]);

        const test = await readSecureConfig(testConfig, "template1");

        assert(exitCode !== 0, `function must exit`);
    });

})
