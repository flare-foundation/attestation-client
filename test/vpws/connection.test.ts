// Run tests with the following command lines.
//  CONFIG_PATH=.secure.dev NODE_ENV=development yarn hardhat test test/vpws/connection.test.ts
// coverage
//  CONFIG_PATH=.secure.dev NODE_ENV=development yarn nyc hardhat test test/vpws/connection.test.ts

import { sleepMs, TraceManager, traceManager } from "@flarenetwork/mcc";
import { expect } from "chai";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { TestLogger } from "../../lib/utils/testLogger";
import { VerificationStatus } from "../../lib/verification/attestation-types/attestation-types";
import { VerificationClient, VerificationClientOptions } from "../../lib/vpwserver/client/verificationProviderClient";
import { Factory } from "../../lib/vpwserver/provider/classFactory";
import { IVerificationProvider, VerificationResult, VerificationType } from "../../lib/vpwserver/provider/verificationProvider";
import { ServerUser } from "../../lib/vpwserver/serverUser";
import { VerificationProviderConfig, VPWSConfig, VPWSCredentials, VPWSProviders, VPWSUsers } from "../../lib/vpwserver/vpwsConfiguration";
import { VerificationProviderWebServer } from "../../lib/vpwserver/vpwsServer";
import { globalSettings } from "../../lib/vpwserver/vpwsSettings";

initializeTestGlobalLogger();

//TestLogger.setDisplay(1);

@Factory("VerificationProvider")
export class MockVP extends IVerificationProvider<MockVP> {


    instanciate(): MockVP {
        return new MockVP();
    }

    public async initialize(): Promise<boolean> {
        return true;
    }

    public getName(): string {
        return "Mock VP";
    }

    public getSupportedVerificationTypes(): (VerificationType)[] {
        //return [new VerificationType(SourceId.BTC, AttestationType.Payment)];
        return [new VerificationType(3, 0)];
    }

    public async verifyRequest(verificationId: number, type: VerificationType, roundId: number, request: string, recheck: boolean): Promise<VerificationResult> {
        return new VerificationResult(VerificationStatus.OK, '{"status":"OK"}');
    }
}

describe("VPWS connection", () => {


    const config = new VPWSConfig();
    const credentials = new VPWSCredentials();

    const users = new VPWSUsers();
    const user0 = new ServerUser();

    let vpws = null;

    before(async function () {
        traceManager.displayStateOnException = false;

        // setup debug trace
        TraceManager.enabled = false;
        traceManager.displayRuntimeTrace = false;
        traceManager.displayStateOnException = false;

        getGlobalLogger().info(`Starting VPWS server...`);

        // setup test configuration
        user0.name = "test0";
        user0.auth = "auth0";
        users.serverUsers.push(user0);
        globalSettings.createUsers(users);

        // setup mock protocols
        const providers = new VPWSProviders();
        const mockProvider = new VerificationProviderConfig();
        mockProvider.name = "MockVP";
        providers.verificationProviders.push(mockProvider);
        await globalSettings.createProviders(providers);

        // create and start indexer
        config.checkAliveIntervalMs = 500;
        vpws = new VerificationProviderWebServer(config, credentials);

        // start VPWS server
        await vpws.runServer(false);

        getGlobalLogger().info(`VPWS server started. Running tests...`);
    });

    beforeEach(async function () {
        TestLogger.clear();
    });

    after(async function () {
        // stop VPWS server
        vpws.stopServer();
    });

    it(`Connection with correct authentication`, async function () {

        const client = new VerificationClient();

        let connected = false;

        try {
            connected = await client.connect(`localhost`, user0.auth);
        }
        catch (error) {
            return;
        }

        expect(connected).eq(true, "Client with correct authorization was unable to connect to VPWS server")
    });

    it(`Connection with incorrect authentication`, async function () {

        const client = new VerificationClient();

        let connected = false;

        try {
            connected = await client.connect(`localhost`, `invalid authorization token`);
        }
        catch (error) {
            return;
        }

        expect(connected).eq(false, "Client with incorrect authorization was able to connect to VPWS server")
    });

    it(`Get supported verifications`, async function () {

        try {
            let error = false;

            const client = new VerificationClient();

            await client.connect(`localhost`, user0.auth);

            const res = await client.getSupported();

            client.disconnect();

            //expect(res).eq(VerificationStatus.OK, "Verification test should return OK");
        }
        catch {
            expect(false).eq(true, "Test caused exception")
        }
    });

    it(`Verification`, async function () {

        try {
            let error = false;

            const client = new VerificationClient();

            await client.connect(`localhost`, user0.auth);

            const res = await client.verify(242237, "0x000300000000000000000000000000066260a797063291d8c476187d0cf1a6e5e0a2a0973b24", true);

            // get result from cache
            const res2 = await client.verify(242237, "0x000300000000000000000000000000066260a797063291d8c476187d0cf1a6e5e0a2a0973b24", true);

            client.disconnect();

            expect(res.status).eq(VerificationStatus.OK, "Verification test should return OK");
        }
        catch {
            expect(false).eq(true, "Test caused exception")
        }
    });

    it(`Verification error`, async function () {

        try {
            const client = new VerificationClient();

            await client.connect(`localhost`, user0.auth);

            const res = await client.verify(242237, "0x000", true);

            client.disconnect();

            //expect(res.status).eq(VerificationStatus.OK, "Verification test should return OK");
        }
        catch {
            expect(false).eq(true, "Test caused exception")
        }
    });

    it(`Server client connection dropped (client down)`, async function () {

        try {
            const client = new VerificationClient();

            client.clientOptions = new VerificationClientOptions();
            client.clientOptions.checkAliveIntervalMs = 100;

            await client.connect(`localhost`, user0.auth);

            client.disconnect();

            await sleepMs(2000);

            expect(TestLogger.exists(`wsc[${client.id}]: ping`)).eq(true);
            expect(TestLogger.exists(`wsc[${client.id}]: close`)).eq(true);
        }
        catch {
            expect(false).eq(true, "Test caused exception")
        }
    });

    // this test MUST be last because it stops server !!!
    it(`Client connection dropped (server down)`, async function () {

        try {
            const client = new VerificationClient();

            client.clientOptions = new VerificationClientOptions();
            client.clientOptions.checkAliveIntervalMs = 100;

            await client.connect(`localhost`, user0.auth);

            await sleepMs(500);

            await vpws.stopServer();

            await sleepMs(500);

            expect(TestLogger.exists(`wsc[${client.id}]: ping`)).eq(true);
            expect(TestLogger.exists(`wsc[${client.id}]: close`)).eq(true);
        }
        catch {
            expect(false).eq(true, "Test caused exception")
        }
    });

});
