import BN from "bn.js";
import Web3 from "web3";
import { Logger } from "winston";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";
import { getWeb3, getWeb3Contract } from "../utils/utils";
import { Web3Functions } from "../utils/Web3Functions";

export class AttesterWeb3 {
  config: AttesterClientConfiguration;
  credentials: AttesterCredentials;
  logger: Logger;

  web3!: Web3;
  stateConnector!: StateConnector;
  web3Functions!: Web3Functions;

  constructor(logger: Logger, configuration: AttesterClientConfiguration, credentials: AttesterCredentials) {
    this.logger = logger;
    this.config = configuration;
    this.credentials=credentials;
    this.web3 = getWeb3(credentials.web.rpcUrl) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.credentials.web.accountPrivateKey);
  }

  async initialize() {
    this.stateConnector = await getWeb3Contract(this.web3, this.credentials.web.stateConnectorContractAddress, "StateConnector");
  }

  async submitAttestation(action: string, bufferNumber: BN, maskedMerkleHash: string, committedRandom: string, revealedRandom: string) {
    let fnToEncode = this.stateConnector.methods.submitAttestation(bufferNumber, maskedMerkleHash, committedRandom, revealedRandom);

    this.logger.debug( `action ............. : ${action}` )
    this.logger.debug( `bufferNumber ....... : ${bufferNumber.toString()}` )
    this.logger.debug( `maskedMerkleHash ... : ${maskedMerkleHash.toString()}` )
    this.logger.debug( `committedRandom .... : ${committedRandom.toString()}` )
    this.logger.debug( `revealedRandom ..... : ${revealedRandom.toString()}` )

    const receipt = await this.web3Functions.signAndFinalize3(action, this.stateConnector.options.address, fnToEncode);
    //console.log(receipt);
    return receipt;
  }
}
