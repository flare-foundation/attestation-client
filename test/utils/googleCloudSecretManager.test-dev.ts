// yarn test test/utils/configuration.test.ts
// yarn nyc yarn test test/utils/configuration.test.ts

import { assert } from "chai";
import sinon from "sinon";
import { getCredentialsKeyByAddress } from "../../src/utils/config/credentialsKey";
import { _clearSecureCredentials } from "../../src/utils/config/jsonSecure";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AdditionalTypeInfo, IReflection } from "../../src/utils/reflection/reflection";
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
    })

    it(`get credentials key google cloud secret manager`, async () => {
        const credentialsPassword = await getCredentialsKeyByAddress("GoogleCloudSecretManager:projects/746294693511/secrets/test1/versions/latest");

        assert(credentialsPassword === password, `credentials password not correct`);

    });


})
