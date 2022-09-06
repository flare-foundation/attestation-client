import { getGlobalLogger } from "../../utils/logger";
import { VerificationClient } from "./verificationProviderClient";

async function testClient() {

  const logger = getGlobalLogger();

  const client = new VerificationClient();

  logger.info( `connecting to VPWS...` );
  await client.connect(`localhost`, `123456`);
  logger.info( `connected.` );


  logger.info( `sending verification request` );
  const res = await client.verify(242237 ,"0x000300000000000000000000000000066260a797063291d8c476187d0cf1a6e5e0a2a0973b24");
  logger.info( `processed ${res.status}` );

  client.disconnect();
  logger.info( `done.` );
}

testClient();