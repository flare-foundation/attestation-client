import WebSocket from 'ws';
import { sleepms } from '../../utils/utils';



export class VerificationClient {

  ws: WebSocket = null;

  connected = false;

  connect(address: string, key: string, port: number = 8088) {
    this.ws = new WebSocket(`wss://${address}:${port}/api/v1/verification/connect?auth=${key}`, {
      protocolVersion: 8,
      rejectUnauthorized: false
    });

    const me = this;

    this.ws.on('open', function open() {
      //ws.send('verify:123ABC');
      console.log("connected");

      me.connected = true;
    });

    this.ws.on('message', function message(data) {
      console.log('received: %s', data);
    });
   
  }

  verify(request: string) {

    console.log(`verify '${request}'`);
    this.ws.send(`verify:${request}`);
  }

  disconnect() {
    if (!this.ws) return;

    this.ws.close();
    this.ws = null;
  }

}




async function testClient() {
  const client = new VerificationClient();

  client.connect(`localhost`, `123456`);

  while( !client.connected ) {
    console.log( `. ${client.connected}`);
    await sleepms( 1000 );
  }

  client.verify("123");

  //client.disconnect();
}

testClient();