import { getGlobalLogger } from "../utils/logger";
import { getAttestationTypeAndSource } from "../verification/generated/attestation-request-parse";
import { ConnectionClient } from "./connectionClient";
import { VerificationType } from "./provider/verificationProvider";
import { globalSettings } from "./vpwsSettings";

export enum VerificationCacheResultType {
    invalid,
    sucessfull,
    providerNotFound,
    invalidRequest,
}

export class VerificationCacheResult {
    error: VerificationCacheResultType = VerificationCacheResultType.invalid;
    result: boolean = false;
}

export class CommandProcessor {

    private logger = getGlobalLogger();

    private verificationCache = new Map<string, VerificationCacheResult>();

    public process(client: ConnectionClient, commandByte: string): boolean {
        const command = commandByte.toString();
        const coms = command.split(':');

        if (coms.length === 0) {
            this.logger.error(`no processor command '${command}' from user '${client.user.name}'`);
            client.ws.send(`error: no command`);
            return;
        }

        const name = coms[0];

        switch (name) {
            case "getSupported": this.getSupported(client); return true;
            case "verify": this.verify(client, parseInt(coms[1]), parseInt(coms[2]), coms[3]); return true;
        }

        this.logger.error(`unknown processor command '${name}' from user '${client.user.name}'`);

        client.ws.send(`error: unknown command`);

        return false;
    }

    protected getSupported(client: ConnectionClient) {
        // todo: send correct verification message
        client.ws.send(`supported...`);
    }

    protected verifyResponse(client: ConnectionClient, id: number, request: string, result: boolean, error: VerificationCacheResultType = VerificationCacheResultType.sucessfull, cached: boolean = false) {
        if (!cached) {
            const cache = new VerificationCacheResult();

            cache.result = result;
            cache.error = error;

            this.verificationCache.set(request, cache);
        }

        if (error !== VerificationCacheResultType.sucessfull) {
            this.logger.error(`verification error ${VerificationCacheResultType[error]}`);
        }

        client.ws.send(`verificationResult:${id}:${result}:${error}:${cached}`);

        this.logger.info( `wsc[${id}]: response(${result},${VerificationCacheResultType[error]})` );
    }

    protected async verify(client: ConnectionClient, verificationId: number, roundId: number, request: string) {
        // check if cached
        var cached = this.verificationCache.get(request);
        if (cached) {
            this.verifyResponse(client, verificationId, request, cached.result, cached.error, true);
            return;
        }

        // find verification provider
        let verificationType = null;

        try {
            let { attestationType, sourceId } = getAttestationTypeAndSource(request);
            verificationType = new VerificationType(attestationType, sourceId);
        }
        catch (error) {
            this.verifyResponse(client, verificationId, request, false, VerificationCacheResultType.invalidRequest);
            return;
        }

        const vp = globalSettings.findVerificationProvider(verificationType);

        if (!vp) {
            this.verifyResponse(client, verificationId, request, false, VerificationCacheResultType.providerNotFound);
            return;
        }

        // verify
        const verificationRes = await vp.verifyRequest(verificationId, verificationType, roundId, request);
        this.verifyResponse(client, verificationId, request, verificationRes);
    }
}