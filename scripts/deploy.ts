const fs = require("fs");

async function main() {
  const StateConnector = artifacts.require("StateConnector");
  let stateConnector = await StateConnector.new();
  console.log(stateConnector.address);
  fs.writeFileSync(`.stateconnector-address`, stateConnector.address, "utf8");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
