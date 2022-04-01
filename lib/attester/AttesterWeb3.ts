import BN from "bn.js";
import Web3 from "web3";
import { Logger } from "winston";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";
import { getWeb3, getWeb3Contract, round } from "../utils/utils";
import { Web3Functions } from "../utils/Web3Functions";
import { AttLogger } from "../utils/logger";
import { AttestationRoundManager } from "./AttestationRoundManager";

export class AttesterWeb3 {
  config: AttesterClientConfiguration;
  credentials: AttesterCredentials;
  logger: AttLogger;

  web3!: Web3;
  stateConnector!: StateConnector;
  web3Functions!: Web3Functions;

  constructor(logger: AttLogger, configuration: AttesterClientConfiguration, credentials: AttesterCredentials) {
    this.logger = logger;
    this.config = configuration;
    this.credentials=credentials;
    this.web3 = getWeb3(credentials.web.rpcUrl) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.credentials.web.accountPrivateKey);
  }

  async initialize() {
    this.stateConnector = await getWeb3Contract(this.web3, this.credentials.web.stateConnectorContractAddress, "StateConnector");
  }

  check(bnString: string) {
    if( bnString.length!=64+2 || bnString[0]!=='0' || bnString[1]!=='x' ) {
      this.logger.error( `invalid BN formating ${bnString}` );
    }
  }

  async submitAttestation(action: string, 
    roundId: number,
    bufferNumber: BN, 
    merkleRoot: string, 
    maskedMerkleRoot: string, 
    random: string,
    hashedRandom: string, 
    revealedRandomPrev: string) {

    this.check(maskedMerkleRoot);
    this.check(hashedRandom);
    this.check(revealedRandomPrev);

    let fnToEncode = this.stateConnector.methods.submitAttestation(bufferNumber, maskedMerkleRoot, hashedRandom, revealedRandomPrev);

    this.logger.info( `action ................. : ${action}` )
    this.logger.info( `bufferNumber_n ......... : ${bufferNumber.toString()}` )
    this.logger.info( `merkleRoot_n ........... : ^e${merkleRoot.toString()}` )
    this.logger.info( `maskedMerkleRoot_n ..... : ${maskedMerkleRoot.toString()}` )
    this.logger.info( `random_n ............... : ^e${random.toString()}` )
    this.logger.info( `hashedRandom_n ......... : ${hashedRandom.toString()}` )
    this.logger.info( `random_n-1 ............. : ${revealedRandomPrev.toString()}` )


    if( process.env.NODE_ENV==="production") {
    //if( true ) {
      const {receipt,nonce} = await this.web3Functions.signAndFinalize3(action, this.stateConnector.options.address, fnToEncode);

      if( receipt ) {
        AttestationRoundManager.state.saveRoundCommited(roundId,nonce,receipt.transactionHash);
        AttestationRoundManager.state.saveRoundRevealed(roundId-1,nonce,receipt.transactionHash);
      }

      return receipt;
    }
    else {
      this.logger.warning(`signAndFinalize3 skipped in ^edevelopment mode^^`);

      return null;
    }
  }
}
