import { encodePayment, encodeReferencedPaymentNonexistence } from "../../../src/verification/generated/attestation-request-encode";
import { ARPayment, ARReferencedPaymentNonexistence } from "../../../src/verification/generated/attestation-request-types";
import { AttestationType } from "../../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../../src/verification/sources/sources";
import { BitVote } from "../../../typechain-web3-v1/BitVoting";
import { AttestationRequest } from "../../../typechain-web3-v1/StateConnector";

export function createBlankAtRequestEvent(
  atType: AttestationType,
  sourceId: SourceId,
  MIC: string,
  timeStamp: string,
  id = "0xfakeId",
  inUtxo = 0,
  utxo = 0
): AttestationRequest {
  let reqData: string;

  switch (atType) {
    case AttestationType.Payment:
      const arPayment: ARPayment = { attestationType: atType, sourceId: sourceId, inUtxo: inUtxo, utxo: utxo, id: id, messageIntegrityCode: MIC };

      reqData = encodePayment(arPayment);
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
      reqData = encodeReferencedPaymentNonexistence(arRef);
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

export function creatBlankBitVoteEvent(vote: string): BitVote {
  const returnData = {
    sender: "0xfakeVoter",
    timestamp: "1234",
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
