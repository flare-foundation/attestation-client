// yarn test test/utils/configuration.test.ts
// yarn nyc yarn test test/utils/configuration.test.ts

import { assert } from "chai";
import sinon from "sinon";
import { prepareSecureCredentials } from "../../src/install/prepareSecureCredentials";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { readJSON, readJSONfromString } from "../../src/utils/config/json";
import { SECURE_MASTER_CONFIGS, _clearSecureCredentials, _prepareSecureData } from "../../src/utils/config/jsonSecure";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { TestLogger } from "../../src/utils/logging/testLogger";
import { AdditionalTypeInfo, IReflection } from "../../src/utils/reflection/reflection";
import { decryptString, encryptString } from "../../src/utils/security/encrypt";

import { getTestFile } from "../test-utils/test-utils";

const password = "t3stPassw0rd";

const secureConfigPath = "test/utils/test-data/config/";

let exitCode = 0;

class TestConfig implements IReflection<TestConfig> {
    key1: number = 0;
    key2: number = 0;
    key3: number = 0;
    key4: number = 0;
    test: string ="";

    instantiate() {
        return new TestConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
        return null;
    }

}

describe(`Test config utils (${getTestFile(__filename)})`, () => {

    before(async () => {
        initializeTestGlobalLogger();

        // Enable Test Logger display
        //TestLogger.setDisplay(1);

        process.env.SECURE_CONFIG_PATH = secureConfigPath;
        process.env.FLARE_NETWORK = `TestNetwork`;
        process.env.CREDENTIALS_KEY = `direct:${password}`;

        sinon.stub(process, 'exit');

        (process.exit as any).callsFake((code) => {
            exitCode = code;
        });

    });

    beforeEach(async () => {
        exitCode = 0;

        _clearSecureCredentials();
    });

    after(() => {
        sinon.restore();
        _clearSecureCredentials();
        delete process.env.SECURE_CONFIG_PATH;
        delete process.env.FLARE_NETWORK;
        delete process.env.CREDENTIALS_KEY;
    })

    // encryption

    it(`Encrypt and decrypt string`, async () => {

        const testData = "THIS IS UNECRYPTED DATA. 123=ABC;";
        const encryptedData = encryptString(password, testData);
        const decryptedData = decryptString(password, encryptedData);

        assert(decryptedData === testData, `decryption does not work`);
    });


    // secure config

    it(`test prepare secure data`, async () => {
        SECURE_MASTER_CONFIGS.push(["test1", "value1"]);
        SECURE_MASTER_CONFIGS.push(["test2", 2]);

        const prepared = await _prepareSecureData(`{"test1"="$(test1)","test2"=$(test2)"}`, "", "TestNetwork");

        assert(prepared === `{"test1"="value1","test2"=2"}`, `prepareSecureData does not work`);
    });

    it(`test prepare secure data value left error`, async () => {
        SECURE_MASTER_CONFIGS.push(["test1", "value1"]);
        SECURE_MASTER_CONFIGS.push(["test2", 2]);

        const prepared = await _prepareSecureData(`{"test1"="$(test1)","test2"=$(test2)", "test3"=$(test3)}`, "", "TestNetwork");

        assert(TestLogger.exists("file ^w^^ (chain ^ETestNetwork^^) variable ^r^W$(test3)^^ left unset (check the configuration)"), `config error not reported`);
    });

    it(`test prepare secure data with network`, async () => {
        SECURE_MASTER_CONFIGS.push(["TestNetworkPassword", "123"]);

        const prepared = await _prepareSecureData(`{"Password"="$($(Network)Password)"}`, "", "TestNetwork");

        assert(prepared === `{"Password"="123"}`, `prepareSecureData with network does not work`);
    });


    // JSON

    it(`parse json with EOL comment`, async () => {
        const prepared = readJSON("test/utils/test-data/json_test_eol_comment.json");

        assert(prepared !== null, `error parsing EOL json password`);
    });

    it(`parse json with multi line comment`, async () => {
        const prepared = readJSONfromString(`/* EOL comment 1 */ { "test": /*COM*/ 1 /* EOL comment 2*/ }`);

        assert(prepared !== null, `error parsing multi line json password`);
    });

    it(`parse json end list comma`, async () => {
        const prepared = readJSONfromString(`{ "test": [ 1,2,3,4,] }`);

        assert(prepared !== null, `error parsing json with end of list comma`);
    });

    it(`parse json error`, async () => {
        try {
            const prepared = readJSONfromString(`{ "test": `, null, true);

            assert(false, `error parsing json with error`);
        }
        catch { }
    });

    it(`prepare secure data env variable`, async () => {
        let testConfig = new TestConfig();

        process.env.ENV_TEST="env_test_value";

        const test = await readSecureConfig(testConfig, "env_test");

        assert(test.test==process.env.ENV_TEST, `invalid 'test' value '${test.test}' (expected '${process.env.ENV_TEST}')`);

        delete process.env.ENV_TEST;
    });

    it(`prepare secure data`, async () => {
        await prepareSecureCredentials(process.env.SECURE_CONFIG_PATH, process.env.CREDENTIALS_KEY, `${secureConfigPath}credentials.json.secure`);
    });

    it(`secure config read`, async () => {
        let testConfig = new TestConfig();

        const test = await readSecureConfig(testConfig, "template1");

        assert(test.key1 === 1, "incorrect config key");
        assert(test.key2 === 2, "incorrect config key");
        assert(test.key3 === 3, "incorrect config key");
        assert(test.key4 === 4, "incorrect config key");

        assert(exitCode === 0, `function must not exit`);
    });
})
