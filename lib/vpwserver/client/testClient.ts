import { getGlobalLogger } from "../../utils/logger";
import { VerificationClient } from "./verificationProviderClient";

async function testClient() {

  const logger = getGlobalLogger();

  const client = new VerificationClient();

  logger.info( `connecting to VPWS...` );
  await client.connect(`localhost`, `123456`);
  logger.info( `connected.` );


  logger.info( `sending verification request` );
  const res = await client.verify(165714, "0x000100000000000000000000000000053c5f1f62d0dacfb3f9ad23643393c79902fbabb199723ac95296f1b06377294d9bca53316d19931bcd26b6efb2837321abc64f0fa8050000");
  logger.info( `processed ${res.status}` );

  client.disconnect();
  logger.info( `done.` );
}

testClient();