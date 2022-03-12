/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { AttestationClientBaseContract } from "./AttestationClientBase";
import { AttestationClientMockContract } from "./AttestationClientMock";
import { AttestationClientSCContract } from "./AttestationClientSC";
import { StateConnectorMockContract } from "./StateConnectorMock";
import { IAttestationClientContract } from "./IAttestationClient";
import { IStateConnectorContract } from "./IStateConnector";
import { MerkleContract } from "./Merkle";
import { StateConnectorContract } from "./StateConnector";

declare global {
  namespace Truffle {
    interface Artifacts {
      require(name: "AttestationClientBase"): AttestationClientBaseContract;
      require(name: "AttestationClientMock"): AttestationClientMockContract;
      require(name: "AttestationClientSC"): AttestationClientSCContract;
      require(name: "StateConnectorMock"): StateConnectorMockContract;
      require(name: "IAttestationClient"): IAttestationClientContract;
      require(name: "IStateConnector"): IStateConnectorContract;
      require(name: "Merkle"): MerkleContract;
      require(name: "StateConnector"): StateConnectorContract;
    }
  }
}

export {
  AttestationClientBaseContract,
  AttestationClientBaseInstance,
} from "./AttestationClientBase";
export {
  AttestationClientMockContract,
  AttestationClientMockInstance,
} from "./AttestationClientMock";
export {
  AttestationClientSCContract,
  AttestationClientSCInstance,
} from "./AttestationClientSC";
export {
  StateConnectorMockContract,
  StateConnectorMockInstance,
} from "./StateConnectorMock";
export {
  IAttestationClientContract,
  IAttestationClientInstance,
} from "./IAttestationClient";
export {
  IStateConnectorContract,
  IStateConnectorInstance,
} from "./IStateConnector";
export { MerkleContract, MerkleInstance } from "./Merkle";
export {
  StateConnectorContract,
  StateConnectorInstance,
} from "./StateConnector";
