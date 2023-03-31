import { Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { IncomingMessage } from "http";
import * as url from "url";
import WebSocket, { Server } from "ws";
import { AttLogger, getGlobalLogger } from "../../../../utils/logging/logger";
import { VerifierConfigurationService } from "../services/verifier-configuration.service";
import { WsCommandProcessorService } from "../services/ws-command-processor.service";

interface ClientRecord {
  id: number;
  name: string;
  ip?: string;
}
@WebSocketGateway()
export class WsServerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // clients: any[] = [];
  clientId = 0;
  connections = new Map<WebSocket, ClientRecord>();

  constructor(@Inject("VERIFIER_CONFIG") private config: VerifierConfigurationService, private commandProcessor: WsCommandProcessorService) {}

  handleConnection(client: WebSocket, ...args: any[]) {
    let request: IncomingMessage = args[0];
    const parsedUrl = url.parse(request.url, true);
    const apiKey = parsedUrl?.query?.apiKey;
    let authenticated = this.config.config.apiKeys.find((x) => x.apiKey === apiKey);
    if (authenticated) {
      this.connections.set(client, {
        id: this.clientId,
        name: authenticated.name,
        ip: authenticated.ip,
      });
      this.logger.info(`Client '${authenticated.name}' connected: '${this.clientId}'`);
      this.clientId++;
      return;
    }
    // Client closed with custom code 4401
    client.close(4401, "Unauthorized");
  }

  handleDisconnect(client: WebSocket) {
    client.close();
    this.logger.info(`Client `);
    this.connections.delete(client);
  }

  private logger: AttLogger = getGlobalLogger("ws");

  afterInit(server: Server) {
    // throw new Error('Method not implemented.'); - comment this
    this.logger.info("Websocket server initialized");
    // check if connections are alive
    const interval = setInterval(() => {
      [...this.connections.keys()].forEach((x) => x.ping());
    }, this.config.config.checkAliveIntervalMs);
  }

  @SubscribeMessage("message")
  handleMessage(@MessageBody() data: string, @ConnectedSocket() client: WebSocket): string {
    let rec = this.connections.get(client);
    this.logger.info(`Message from client: '${rec.id}', user '${rec.name}'`);
    return JSON.stringify({
      client,
      data,
    });
  }

  @SubscribeMessage("mirror")
  handleMirrorMessage(@MessageBody() data: any, @ConnectedSocket() client: WebSocket) {
    return this.commandProcessor.mirrorResponse(data);
  }

  // @SubscribeMessage("supported")
  // handleSupportedMessage(
  // ) {
  //    return this.commandProcessor.supportedAttestationTypes();
  // }
}
