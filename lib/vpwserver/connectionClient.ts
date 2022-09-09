import { AttLogger, getGlobalLogger } from "../utils/logger";
import { ServerUser } from "./serverUser";
import { VerificationProviderWebServer } from "./vpwsServer";

/**
 * Class handling server client connection
 */
export class ConnectionClient {

    server: VerificationProviderWebServer;

    user: ServerUser;

    ws: any;

    id: number;

    logger: AttLogger;

    /**
     * Create new server client connection
     * @param server 
     * @param id 
     * @param ws 
     */
    constructor(server: VerificationProviderWebServer, id: number, ws: any) {
        this.server = server;
        this.id = id;
        this.ws = ws;
        this.user = ws.serverUser;

        this.logger = getGlobalLogger();

        this.logger.debug(`wsc[${id}]: connected '${this.user.name}' from ip ${ws.client.localAddress}`);

        const me = this;
        ws.on('message', function message(data) {
            me.processClientMessage(data);
        });

        ws.send(`connected\t${id}`);

        // detect broken link from server side
        ws.isAlive = true;
        ws.on('pong', function () { this.isAlive = true; });
    }

    /**
     * Process Client message
     * @param data 
     */
    public processClientMessage(data: string) {
        this.logger.debug(`wsc[${this.id}]: request(${data})`);

        this.server.commandProcessor.process(this, data);
    }

    /**
     * Process Ping that keeps connection live
     */
    public ping() {
        if (this.ws.isAlive === false) {
            this.close();
            return;
        }

        this.logger.debug(`wsc[${this.id}]: ping`);
        this.ws.isAlive = false;
        this.ws.ping();
    }

    /**
     * Close connection
     */
    close() {
        this.server.closeClient(this);
    }

    /**
     * Internal close connection
     */
    _close() {
        this.ws.terminate();

        this.logger.debug(`wsc[${this.id}]: close`);
    }

}