// setup the following variables in .env:
// - STATECONNECTOR_ADDRESS
// - COSTON_RPC or SONGBIRD_RPC
// - DEPLOYER_PRIVATE_KEY
// Then use (use the correct network):
// yarn hardhat run scripts/deploy-attestation-client.ts --network coston

import dotenv from "dotenv";
dotenv.config();

async function deployAttestationClient() {
  let stateConnectorAddress = process.env.STATECONNECTOR_ADDRESS;
  if(!stateConnectorAddress) {
    console.error("No STATECONNECTOR_ADDRESS. Aborting")
    return;
  }
  const fs = require("fs");

  const AttestationClientSC = artifacts.require("AttestationClientSC");
  let attestationClientSC = await AttestationClientSC.new(stateConnectorAddress);
  console.log(attestationClientSC.address);
  fs.writeFileSync(`.attestation-client-address`, attestationClientSC.address, "utf8");
}

deployAttestationClient()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
