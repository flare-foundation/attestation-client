import { VerificationClient } from "../../lib/verification/client/verificationProviderClient";

const API_KEY = "123456"
const WS_URL = `ws://localhost:9500`;

describe("Test websocket verifier server ", () => {

  it(`Should connect `, async function () {
    let client = new VerificationClient();
    await client.connect(WS_URL);
    assert(client.connected, `Client should be connected`)
  });

  it(`Should disconnect`, async function () {
    let client = new VerificationClient();
    await client.connect(WS_URL);
  });

  it(`Should send attestation request `, async function () {
    
  });

});



// async function testClient() {

//   const logger = getGlobalLogger();

//   const client = new VerificationClient();

//   logger.info( `connecting to VPWS...` );
//   try {
//     await client.connect(`localhost`, `123456`);
//   }
//   catch( error ) {
//     logger.info( `connection failed '${error}'` );
//     return;
//   }
//   logger.info( `connected.` );


//   logger.info( `sending verification request` );
//   try {
//     const res = await client.verify(242237 ,"0x000300000000000000000000000000066260a797063291d8c476187d0cf1a6e5e0a2a0973b24",true);
//     logger.info( `processed ${res.status}` );
//   }
//   catch( error ) {
//     logException( error , "" );
//   }

//   client.disconnect();
//   logger.info( `done.` );
// }

// testClient();