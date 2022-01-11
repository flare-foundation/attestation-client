import BN from "bn.js";
import Web3 from "web3";
import { Logger } from "winston";
import { StateConnector } from "../typechain-web3-v1/StateConnector";
import { AttesterClientConfiguration } from "./AttesterClientConfiguration";
import { getWeb3, getWeb3Contract, toHex } from "./utils";
import { Web3Functions } from "./Web3Functions";

export class AttesterWeb3 {
  conf: AttesterClientConfiguration;
  logger: Logger;

  web3!: Web3;
  stateConnector!: StateConnector;
  web3Functions!: Web3Functions;

  constructor(logger: Logger, configuration: AttesterClientConfiguration) {
    this.logger = logger;
    this.conf = configuration;
    this.web3 = getWeb3(this.conf.rpcUrl) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.conf.accountPrivateKey);
  }

  async initialize() {
    this.stateConnector = await getWeb3Contract(this.web3, this.conf.stateConnectorContractAddress, "StateConnector");
  }

  // todo: must be a queue
  async submitAttestation(action: string, bufferNumber: BN, maskedMerkleHash: BN, committedRandom: BN, revealedRandom: BN) {
    let fnToEncode = this.stateConnector.methods.submitAttestation(bufferNumber, toHex(maskedMerkleHash), toHex(committedRandom), toHex(revealedRandom));

    const receipt = await this.web3Functions.signAndFinalize3(action, this.stateConnector.options.address, fnToEncode);

    return receipt;
  }
}
