import WebSocket from 'ws';
import { sleepms } from '../../utils/utils';



export class VerificationClient {

  ws: WebSocket = null;

  connected = false;

  nextId = 1000;

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

  verify(roundId: number, request: string) : number {
    const id = this.nextId++;
    console.log(`verify id=${id} : ${roundId} , '${request}'`);
    this.ws.send(`verify:${id}:${roundId}:${request}`);

    return id;
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

  client.verify(165714, "0x000100000000000000000000000000053c5f1f62d0dacfb3f9ad23643393c79902fbabb199723ac95296f1b06377294d9bca53316d19931bcd26b6efb2837321abc64f0fa8050000");

  //client.disconnect();
}

testClient();