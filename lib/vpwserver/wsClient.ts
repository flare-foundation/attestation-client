import { AttLogger, getGlobalLogger } from "../utils/logger";
import { ServerClient } from "./serverClient";
import { VerificationProviderWebServer } from "./verificationProviderWebServer";

export class WSClient {

    server: VerificationProviderWebServer;

    client: ServerClient;

    ws: any;

    id: number;

    logger: AttLogger;

    constructor(server: VerificationProviderWebServer, id: number, ws: any) {
        this.server = server;
        this.id = id;
        this.ws = ws;
        this.client = ws.serverClient;

        this.logger = getGlobalLogger();

        this.logger.debug(`wsc[${id}]: connected '${this.client.name}' from ip ${this.ws.client.localAddress}`);

        const me = this;
        ws.on('message', function message(data) { me.handleMessage(data); });

        ws.send('connected');
        ws.send(`id=${id}`);

        // detect broken link from server side
        ws.isAlive = true;
        ws.on('pong', function () { this.isAlive = true; });
    }

    handleMessage(data: string) {
        this.logger.debug(`wsc[${this.id}]: request(${data})`);
    }

    ping() {
        if (this.ws.isAlive === false) {
            this.close();
            return;
        }

        this.logger.debug(`wsc[${this.id}]: ping`);
        this.ws.isAlive = false;
        this.ws.ping();
    }

    close() {
        this.server.closeClient(this);
    }

    _close() {
        this.ws.terminate();

        this.logger.debug(`wsc[${this.id}]: close`);
    }

}