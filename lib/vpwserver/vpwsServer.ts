import { readFileSync } from 'fs';
import { createServer, Server } from 'https';
import { WebSocketServer } from 'ws';
import { AttLogger, getGlobalLogger } from '../utils/logger';
import { sleepms } from '../utils/utils';
import { VPWSConfig, VPWSCredentials } from './vpwsConfiguration';
import { globalSettings } from './vpwsSettings';
import { ConnectionClient } from './connectionClient';
import { CommandProcessor } from './commandProcessor';

export class VerificationProviderWebServer {

    server: Server;

    wss: WebSocketServer;

    config: VPWSConfig;
    credentials: VPWSCredentials;

    clients = new Array<ConnectionClient>();
    nextClientId = 1000;

    commandProcessor = new CommandProcessor();

    logger: AttLogger;

    constructor(config: VPWSConfig, credentials: VPWSCredentials) {
        const me = this;

        this.config = config;
        this.credentials = credentials;

        this.logger = getGlobalLogger();

        this.server = createServer({
            cert: readFileSync(config.serverCertificatePath),
            key: readFileSync(config.serverKeyPath)
        });

        const server = this.server;

        this.wss = new WebSocketServer({ noServer: true });
        this.wss.on('connection', function connection(ws) {
            const id = me.nextClientId++;
            me.clients.push(new ConnectionClient(me, id, ws));
        });

        this.server.on('upgrade', function upgrade(request, socket, head) {
            me.authenticateClient(request, socket, head);
        });

        // check if connections are alive
        const interval = setInterval(function ping() {
            me.clients.forEach(x => x.ping());
        }, this.config.checkAliveIntervalMs);
    }

    authenticateClient(request: any, socket: any, head: any) {
        const me = this;
        const client = request.client;

        if (!client) {
            this.logger.error2(`unauthorized '${client.localAddress}' no client`);

            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // parse url
        const com = request.url.split('?');
        const path = com[0].split('/');
        const args = com.length > 0 ? com[1].split('&') : [];

        const urlArgs = new Map<string, string>();

        for (let arg of args) {
            const argSplit = arg.split('=');
            if (argSplit.length !== 2) continue;

            urlArgs.set(argSplit[0], argSplit[1]);
        }

        const auth = urlArgs.get("auth");

        const serverUser = globalSettings.findUser(auth, client.localAddress);
        if (!serverUser) {
            this.logger.error2(`unauthorized '${client.localAddress}'`);

            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        else {
            this.logger.info(`accept connection '${client.localAddress}'`);
            this.wss.handleUpgrade(request, socket, head, function done(ws) {
                ws.serverUser = serverUser;
                ws.client = client;

                me.wss.emit('connection', ws, request, client);
            });
        }
    }

    closeClient(client: ConnectionClient) {
        for (let a = 0; a < this.clients.length; a++) {
            if (this.clients[a].id === client.id) {
                this.clients.splice(a, 1);
                client._close();
                return true;
            }
        }

        this.logger.error2(`unable to close ${client.id}`);

        return false;
    }

    async startServer() {
        this.logger.info(`starting server on port ${this.config.serverPort}`);

        this.server.listen(this.config.serverPort);
    }

    async runServer() {
        this.startServer();

        globalSettings.initializeProviders();

        while (true) {
            await sleepms(1000);
        }
    }

}