import { WSServerConfigurationService } from "@atc/common";
import { UseGuards } from "@nestjs/common";
import {
   ConnectedSocket, MessageBody, OnGatewayConnection,
   OnGatewayDisconnect, OnGatewayInit, SubscribeMessage,
   WebSocketGateway, WebSocketServer
} from "@nestjs/websockets";
import { Request } from "express";
import WebSocket, { Server } from 'ws';
import { AttLogger, getGlobalLogger } from "../../../utils/logger";
import { AuthGuard } from "./guards/auth.guard";
import * as url from "url";
import { IncomingMessage } from "http";

@WebSocketGateway(
   // {
   //    transports: ['websocket'],
   //    verifyClient: (info, cb) => {
   //       // console.log(info.req);
   //       let request = info.req as Request;

   //       let apiKey = url.parse(request.url, true).query.api;
   //       console.log("API", apiKey)
   //       // console.log(this.config)
   //       cb(true, 200);
   //    }
   // }
)
@UseGuards(AuthGuard)
export class WsServerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

   @WebSocketServer() server: Server;

   clients: any[] = [];

   constructor(private config: WSServerConfigurationService) { 
   }

   handleConnection(client: WebSocket, ...args: any[]) {
      
      let request: IncomingMessage = args[0];
      let apiKey = url.parse(request.url, true).query.api;
      if(!this.config.wsServerCredentials.apiKey || apiKey === this.config.wsServerCredentials.apiKey) {
         this.clients.push(client);
         console.log("Client connected:", this.clients.length);
         if (this.clients.length == 2) {
            console.log(this.clients[0] == this.clients[0], this.clients[0] == this.clients[1])
         }
         return;
      }
      client.terminate();
   }

   handleDisconnect(client: WebSocket) {
      for (let i = 0; i < this.clients.length; i++) {
         if (this.clients[i] == client) {
            this.clients.splice(i, 1);
            client.close();
            return true;
         }
      }
      return false;
   }

   private logger: AttLogger = getGlobalLogger("ws");

   afterInit(server: Server) {

      // throw new Error('Method not implemented.'); - comment this
      this.logger.info("Initialized");
      // check if connections are alive
      const interval = setInterval(() => {
         this.clients.forEach(x => x.ping());
      }, this.config.wsServerConfiguration.checkAliveIntervalMs);
   }
   // export class AppGateway {
   @SubscribeMessage("message")
   handleMessage(
      @MessageBody() data: string,
      @ConnectedSocket() client: WebSocket,
   ): string {
      console.log("Message from client: ", this.clients.findIndex(c => c == client) + 1)
      return JSON.stringify({
         client,
         data
      })
   }
}

// var ws = new WebSocket("ws://localhost:9500")
// ws.onmessage = (event) => console.log(JSON.parse(event.data));
// ws.onerror = (event) => console.log(event);
// var data = { a: 1, b: "two" };

// ws.send(JSON.stringify({ event: "message", data }))

// import {
//    MessageBody,
//    SubscribeMessage,
//    WebSocketGateway,
//    WebSocketServer,
//    WsResponse,
// } from '@nestjs/websockets';
// import { from, Observable } from 'rxjs';
// import { map } from 'rxjs/operators';
// import { Server } from 'ws';

// @WebSocketGateway({
//    cors: {
//       origin: '*',
//    },
// })
// export class AppGateway {
//    @WebSocketServer()
//    server: Server;

//    @SubscribeMessage('events')
//    findAll(@MessageBody() data: any): Observable<WsResponse<number>> {
//       return from([1, 2, 3]).pipe(map(item => ({ event: 'events', data: item })));
//    }

//    @SubscribeMessage('identity')
//    async identity(@MessageBody() data: number): Promise<number> {
//       return data;
//    }
// }