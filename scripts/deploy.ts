
async function deployStateConnector() {
  const fs = require("fs");
  const StateConnector = artifacts.require("StateConnector");
  let stateConnector = await StateConnector.new();
  console.log(stateConnector.address);
  fs.writeFileSync(`.stateconnector-address`, stateConnector.address, "utf8");
}

deployStateConnector()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
