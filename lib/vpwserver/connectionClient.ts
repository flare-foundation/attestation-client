import { AttLogger, getGlobalLogger } from "../utils/logger";
import { ServerUser } from "./serverUser";
import { VerificationProviderWebServer } from "./vpwsServer";

export class ConnectionClient {

    server: VerificationProviderWebServer;

    user: ServerUser;

    ws: any;

    id: number;

    logger: AttLogger;

    constructor(server: VerificationProviderWebServer, id: number, ws: any) {
        this.server = server;
        this.id = id;
        this.ws = ws;
        this.user = ws.serverUser;

        this.logger = getGlobalLogger();

        this.logger.debug(`wsc[${id}]: connected '${this.user.name}' from ip ${ws.client.localAddress}`);

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

        this.server.commandProcessor.process(this, data);
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