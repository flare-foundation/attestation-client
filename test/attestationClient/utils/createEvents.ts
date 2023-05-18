import { prefix0x } from "@flarenetwork/mcc";
import Web3 from "web3";
import { toBN } from "web3-utils";
import { Attestation } from "../../../src/attester/Attestation";
import { AttestationData } from "../../../src/attester/AttestationData";
import { AttestationDefinitionStore } from "../../../src/verification/attestation-types/AttestationDefinitionStore";
import { MIC_SALT, Verification, VerificationStatus } from "../../../src/verification/attestation-types/attestation-types";
import { DHPayment } from "../../../src/verification/generated/attestation-hash-types";
import { ARPayment, ARReferencedPaymentNonexistence } from "../../../src/verification/generated/attestation-request-types";
import { AttestationType } from "../../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../../src/verification/sources/sources";
import { BitVote } from "../../../typechain-web3-v1/BitVoting";
import { AttestationRequest } from "../../../typechain-web3-v1/StateConnector";

export function createBlankAtRequestEvent(
  defStore: AttestationDefinitionStore,
  atType: AttestationType,
  sourceId: SourceId,
  blockNumber: number,
  MIC: string,
  timeStamp: string,
  id = "0xfakeId",
  inUtxo = 0,
  utxo = 0
): AttestationRequest {
  let reqData: string;

  switch (atType) {
    case AttestationType.Payment:
      const arPayment: ARPayment = { attestationType: atType, blockNumber, sourceId: sourceId, inUtxo: inUtxo, utxo: utxo, id: id, messageIntegrityCode: MIC };

      reqData = defStore.encodeRequest(arPayment);
      break;
    case AttestationType.ReferencedPaymentNonexistence:
      const arRef: ARReferencedPaymentNonexistence = {
        attestationType: atType,
        sourceId: sourceId,
        messageIntegrityCode: MIC,
        minimalBlockNumber: 2,
        deadlineBlockNumber: 5,
        deadlineTimestamp: 5312,
        destinationAddressHash: "0xFakeAdress",
        amount: 100,
        paymentReference: "0xfakeref",
      };
      reqData = defStore.encodeRequest(arRef);
  }

  const returnData = {
    sender: "0x000000000000000000000000000001fake",
    timestamp: timeStamp,
    data: reqData,
    0: "",
    1: "",
    2: "",
  };
  const request: AttestationRequest = {
    event: "AttestationRequest",
    address: "",
    returnValues: returnData,
    logIndex: 1,
    transactionIndex: 1,
    transactionHash: "0x000fake",
    blockHash: "0x04824",
    blockNumber: 12456,
  };
  return request;
}

export function createBlankBitVoteEvent(vote: string, timestamp = "1234"): BitVote {
  const returnData = {
    sender: "0xfakeVoter",
    timestamp: timestamp,
    data: vote,
    0: "",
    1: "",
    2: "",
  };

  const bitVote: BitVote = {
    event: "BitVote",
    address: "",
    returnValues: returnData,
    logIndex: 1,
    transactionIndex: 1,
    transactionHash: "0x000fakeVote",
    blockHash: "0x048244",
    blockNumber: 12457,
  };

  return bitVote;
}

export function createAttestationVerificationPair(defStore: AttestationDefinitionStore, reqId: string, round: number, logIndex: number, micOk: boolean, status: VerificationStatus) {
  const id = Web3.utils.randomHex(32);
  const sender = Web3.utils.randomHex(32);

  const arPayment: ARPayment = {
    attestationType: AttestationType.Payment,
    sourceId: SourceId.XRP,
    blockNumber: 1,
    messageIntegrityCode: "",
    id: reqId,
    inUtxo: "",
    utxo: "",
  };

  const reqData = defStore.encodeRequest(arPayment);

  const request: AttestationRequest = {
    returnValues: {
      sender: sender,
      timestamp: "200001929",
      data: reqData,
      0: "",
      1: "",
      2: "",
    },
    event: "AttestationRequest",
    address: "0xfakeAddress",
    logIndex: logIndex,
    transactionIndex: 4,
    transactionHash: "0xab09cb4741a17affd32ee0b173ef0a2920be0ea5b7351975d08d992dbcc1cd4a",
    blockHash: "0x9c89eacfcf08f02d6056ab3aa9bbda952028c0d700d061fbb8e35abd5556af2c",
    blockNumber: 12456,
  };

  const response: DHPayment = {
    stateConnectorRound: round,
    blockNumber: toBN(10),
    blockTimestamp: toBN(109214),
    transactionHash: "0x9F1ADBE4958AFE4D28138C22B90DA0DBD4FE45BC72C222CB5B78D2F20F79E351".toLowerCase(),
    inUtxo: toBN(0),
    utxo: toBN(0),
    sourceAddressHash: prefix0x(Web3.utils.randomHex(32)),
    intendedSourceAddressHash: prefix0x(Web3.utils.randomHex(32)),
    receivingAddressHash: prefix0x(Web3.utils.randomHex(32)),
    intendedReceivingAddressHash: prefix0x(Web3.utils.randomHex(32)),
    spentAmount: toBN(13),
    intendedSpentAmount: toBN(13),
    receivedAmount: toBN(12),
    intendedReceivedAmount: toBN(12),
    paymentReference: "0x0",
    oneToOne: true,
    status: toBN(0),
  };

  const verification: Verification<ARPayment, DHPayment> = {
    hash: prefix0x(Web3.utils.randomHex(32)),
    request: arPayment,
    response: response,
    status: status,
  };

  if (micOk) {
    const mic = defStore.dataHash(arPayment, response, MIC_SALT);
    arPayment.messageIntegrityCode = mic;
    const reqData = defStore.encodeRequest(arPayment);
    request.returnValues.data = reqData;
  }

  const attData = new AttestationData(request);

  const attestation = new Attestation(round, attData);

  return { attestation, verification };
}
