// yarn test test/utils/configuration.test.ts
// yarn nyc yarn test test/utils/configuration.test.ts

import { assert } from "chai";
import sinon from "sinon";
import { prepareSecureCredentials } from "../../lib/install/prepareSecureCredentials";
import { readSecureConfig, readSecureCredentials } from "../../lib/utils/configSecure";
import { getCredentialsKey, getCredentialsKeyByAddress } from "../../lib/utils/credentialsKey";
import { decryptString, encryptString } from "../../lib/utils/encrypt";
import { readJSON, readJSONfromString } from "../../lib/utils/json";
import { secureMasterConfigs, _clearSecureCredentials, _prepareSecureData } from "../../lib/utils/jsonSecure";
import { initializeTestGlobalLogger } from "../../lib/utils/logger";
import { AdditionalTypeInfo, IReflection } from "../../lib/utils/reflection";
import { TestLogger } from "../../lib/utils/testLogger";
import { getTestFile } from "../test-utils/test-utils";

const password = "t3stPassw0rd";

const secureConfigPath = "test/utils/test-data/config/";

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

describe(`Test credentials config utils (${getTestFile(__filename)})`, () => {

    before(async () => {
        initializeTestGlobalLogger();

        // Enable Test Logger display
        //TestLogger.setDisplay(1);

        process.env.SECURE_CONFIG_PATH = secureConfigPath;
        process.env.SECURE_CONFIG_NETWORK = `TestNetwork`;
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

    // encryption

    it(`Encrypt and decrypt string`, async () => {

        const testData = "THIS IS UNECRYPTED DATA. 123=ABC;";
        const encryptedData = encryptString(password, testData);
        const decryptedData = decryptString(password, encryptedData);

        assert(decryptedData === testData, `decryption does not work`);
    });


    // secure config

    it(`test prepare secure data`, async () => {
        secureMasterConfigs.push(["test1", "value1"]);
        secureMasterConfigs.push(["test2", 2]);

        const prepared = _prepareSecureData(`{"test1"="$(test1)","test2"=$(test2)"}`, "", "TestNetwork");

        assert(prepared === `{"test1"="value1","test2"=2"}`, `prepareSecureData does not work`);
    });

    it(`test prepare secure data value left error`, async () => {
        secureMasterConfigs.push(["test1", "value1"]);
        secureMasterConfigs.push(["test2", 2]);

        const prepared = _prepareSecureData(`{"test1"="$(test1)","test2"=$(test2)", "test3"=$(test3)}`, "", "TestNetwork");

        assert(TestLogger.exists("file ^w^^ (chain ^ETestNetwork^^) variable ^r^W$(test3)^^ left unset (check the configuration)"), `config error not reported`);
    });

    it(`test prepare secure data with network`, async () => {
        secureMasterConfigs.push(["TestNetworkPassword", "123"]);

        const prepared = _prepareSecureData(`{"Password"="$($(Network)Password)"}`, "", "TestNetwork");

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

    it(`get credentials invalid format`, async () => {
        const credentialsPassword = await getCredentialsKeyByAddress("provider:address:invalid");

        assert(exitCode !== 0, `exit not called`);
    });

    it(`get credentials invalid address`, async () => {
        const credentialsPassword = await getCredentialsKeyByAddress("unknown:some address");

        assert(exitCode !== 0, `exit not called`);
    });

    it(`get credentials key direct`, async () => {
        const credentialsPassword = await getCredentialsKey();

        assert(credentialsPassword === password, `credentials password not correct`);

    });

    // The test fails
    it.skip(`get credentials key google cloud secret manager`, async () => {
        const credentialsPassword = await getCredentialsKeyByAddress("GoogleCloudSecretManager:projects/746294693511/secrets/test1/versions/latest");

        assert(credentialsPassword === password, `credentials password not correct`);

    });

    it(`get credentials key google cloud secret manager invalid name`, async () => {
        const credentialsPassword = await getCredentialsKeyByAddress("GoogleCloudSecretManager:invalid name");

        assert(exitCode !== 0, `exit not called`);
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

    it(`secure credentials read`, async () => {
        let testConfig = new TestConfig();

        const test = await readSecureCredentials(testConfig, "template1");

        assert(test.key1 === 1, "incorrect config key");
        assert(test.key2 === 2, "incorrect config key");
        assert(test.key3 === 3, "incorrect config key");
        assert(test.key4 === 4, "incorrect config key");

        assert(exitCode === 0, `function must not exit`);
    });

    it(`test empty credentials at start`, async () => {
        let testConfig = new TestConfig();

        secureMasterConfigs.push(["dummy", 123]);

        const test = await readSecureConfig(testConfig, "template1");

        assert(exitCode !== 0, `function must exit`);
    });



})
