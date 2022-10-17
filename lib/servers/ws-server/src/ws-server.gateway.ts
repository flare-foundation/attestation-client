import {
   SubscribeMessage,
   WebSocketGateway,
   OnGatewayInit,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";

@WebSocketGateway()
export class WsServerGateway implements OnGatewayInit {
   private logger: Logger = new Logger("AppGateway");

   afterInit(server: any) {
      // throw new Error('Method not implemented.'); - comment this
      this.logger.log("Initialized");
   }
   // export class AppGateway {
   @SubscribeMessage("message")
   handleMessage(client: any, payload: any): string {
      return payload;
   }
}

// var ws = new WebSocket("ws://localhost:9500")
// ws.onmessage = (event) => console.log(JSON.parse(event.data));
// var data = {a: 1, b:"two"};
// ws.send(JSON.stringify({event: "message", data}))

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