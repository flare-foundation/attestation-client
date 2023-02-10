import Web3 from "web3";

/**
 * Returns crypto safe 32-byte random hex string using web3.js generator
 * @returns Random 32-byte string
 */

export async function getCryptoSafeRandom(length = 32) {
  return Web3.utils.randomHex(length);
}
