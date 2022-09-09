import { getGlobalLogger, logException } from "../utils/logger";
import { getAttestationTypeAndSource } from "../verification/generated/attestation-request-parse";
import { ConnectionClient } from "./connectionClient";
import { VerificationResult, VerificationType } from "./provider/verificationProvider";
import { globalSettings } from "./vpwsSettings";

export enum CommandProcessorError {
    invalidCommand,
    invalidParameterCount,
    invalidVerificationProvider,
    errorProcessingCommand,
}

export enum VerificationCacheResultType {
    invalid,
    sucessfull,
    invalidRequest,
}

export class VerificationCacheResult {
    error: VerificationCacheResultType = VerificationCacheResultType.invalid;
    result: VerificationResult = null;
}

export class CommandProcessor {

    private logger = getGlobalLogger();

    private verificationCache = new Map<string, VerificationCacheResult>();


    /**
     * Report error back to the client
     * @param client 
     * @param id 
     * @param name 
     * @param error 
     * @param comment 
     */
    private reportError(client: ConnectionClient, id: number, name: string, error: CommandProcessorError, comment: string) {
        this.logger.error(`CommandProcessor:${name} invalid number of arguments. ${comment})`);

        client.ws.send(`error\t${id}\t${CommandProcessorError[CommandProcessorError.invalidParameterCount]}\t${comment}`);
    }


    /**
     * 
     * @param client Check if correct parameter count, if not report error back to client
     * @param id 
     * @param name 
     * @param expectedCount 
     * @param actualCount 
     * @returns 
     */
    private checkParameterCount(client: ConnectionClient, id: number, name: string, expectedCount: number, actualCount: number) {
        if (actualCount == expectedCount) return true;

        this.reportError(client, id, name, CommandProcessorError.invalidParameterCount, `${expectedCount} parameters expected`);

        return false;
    }

    /**
     * Process client request.
     * Request string is separated by tab character \t
     * First two parameters are command name and command id.
     * 
     * @param client
     * @param commandByte 
     * @returns 
     */
    public process(client: ConnectionClient, commandByte: string): boolean {
        let commandName = "";
        let commandId = -1;

        try {
            const parametersString = commandByte.toString();
            const parameters = parametersString.split('\t');

            if (parameters.length < 2) {
                this.reportError(client, commandId, commandName, CommandProcessorError.invalidParameterCount, `at least 2 command parameters are expected`);
                return false;
            }

            // get main parameters
            commandName = parameters[0];
            commandId = parseInt(parameters[1]);

            switch (commandName) {
                case "getSupported": {
                    if (!this.checkParameterCount(client, commandId, commandName, 2 + 0, parameters.length)) {
                        return false;
                    };
                    this.getSupported(client, commandId);
                    return true;
                }
                case "verify": {
                    if (!this.checkParameterCount(client, commandId, commandName, 2 + 3, parameters.length)) {
                        return false;
                    };
                    this.verify(client, commandId, parseInt(parameters[2]), parameters[3], parameters[4] === "true");
                    return true;
                }
            }

            this.reportError(client, commandId, commandName, CommandProcessorError.invalidCommand, `unknown command '${commandName}'`);

            return false;
        }
        catch (error) {
            logException(error, `CommandProcessor`);

            this.reportError(client, commandId, commandName, CommandProcessorError.errorProcessingCommand, error.message);
        }
    }


    /**
     * Returns supported attestation types
     * @param client
     */
    protected getSupported(client: ConnectionClient, id: number) {
        const supported = globalSettings.getSupportedVerifications();
        client.ws.send(`getSupportedResult\t${id}\t${JSON.stringify(supported)}`);
    }

    /**
     * Send verify request response and add result into cache.
     * @param client 
     * @param id 
     * @param request 
     * @param result 
     * @param error 
     * @param cached 
     */
    protected sendVerifyResponse(client: ConnectionClient, id: number, request: string, result: VerificationResult, error: VerificationCacheResultType = VerificationCacheResultType.sucessfull, cached: boolean = false) {
        if (!cached) {
            const cache = new VerificationCacheResult();

            cache.result = result;
            cache.error = error;

            this.verificationCache.set(request, cache);
        }

        if (error !== VerificationCacheResultType.sucessfull) {
            this.logger.error(`verification error ${VerificationCacheResultType[error]}`);
        }

        client.ws.send(`verificationResult\t${id}\t${result.status}\t${result.response ? result.response : ""}\t${error}\t${cached}`);

        this.logger.info(`wsc[${id}]: response(${result},${VerificationCacheResultType[error]})`);
    }

    /**
     * Verify request.
     * @param client 
     * @param verificationId 
     * @param roundId 
     * @param request 
     * @param recheck 
     * @returns 
     */
    protected async verify(client: ConnectionClient, verificationId: number, roundId: number, request: string, recheck: boolean) {
        // check if cached
        var cached = this.verificationCache.get(request);
        if (cached) {
            this.sendVerifyResponse(client, verificationId, request, cached.result, cached.error, true);
            return;
        }

        // find verification provider
        let verificationType = null;

        try {
            let { attestationType, sourceId } = getAttestationTypeAndSource(request);
            verificationType = new VerificationType(attestationType, sourceId);
        }
        catch (error) {
            this.reportError(client, verificationId, "verificationResult", CommandProcessorError.errorProcessingCommand, error.message);
            return;
        }

        const vp = globalSettings.findVerificationProvider(verificationType);

        if (!vp) {
            this.reportError(client, verificationId, "verificationResult", CommandProcessorError.invalidVerificationProvider, verificationType);
            return;
        }

        // verify
        const verificationRes = await vp.verifyRequest(verificationId, verificationType, roundId, request, recheck);
        this.sendVerifyResponse(client, verificationId, request, verificationRes);
    }
}