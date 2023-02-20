const BitVoting = artifacts.require("BitVoting");

async function deploy() {
  const bitVoting = await BitVoting.new();
  console.log(`Contract deployed at: ${bitVoting.address}`)
}

deploy()
  .then(() => { process.exit(0) })
  .catch(e => {
    console.log(e);
    process.exit(1);
  })
