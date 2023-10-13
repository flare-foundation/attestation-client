import { prefix0x } from "@flarenetwork/mcc";
import Web3 from "web3";
import { Attestation } from "../../../src/attester/Attestation";
import { AttestationData } from "../../../src/attester/AttestationData";
import { AttestationDefinitionStore } from "../../../src/external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../src/external-libs/AttestationResponse";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName } from "../../../src/external-libs/utils";
import { Payment_Request, Payment_Response } from "../../../src/servers/verifier-server/src/dtos/attestation-types/Payment.dto";
import { ReferencedPaymentNonexistence_Request } from "../../../src/servers/verifier-server/src/dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import { BitVote } from "../../../typechain-web3-v1/BitVoting";
import { AttestationRequest } from "../../../typechain-web3-v1/StateConnector";
import { ethers } from "ethers";

export function createBlankAtRequestEvent(
  defStore: AttestationDefinitionStore,
  atType: string,
  sourceId: string,
  blockNumber: number,
  MIC: string,
  timeStamp: string,
  id = ethers.zeroPadBytes("0x1d1d1d", 32),
  inUtxo = 0,
  utxo = 0
): AttestationRequest {
  let reqData: string;

  switch (atType) {
    case "Payment":
      const arPayment: Payment_Request = {
        attestationType: encodeAttestationName(atType),
        messageIntegrityCode: MIC,
        sourceId: encodeAttestationName(sourceId),
        requestBody: {
          transactionId: id,
          inUtxo: inUtxo.toString(),
          utxo: utxo.toString(),
        }
      };
      reqData = defStore.encodeRequest(arPayment);
      break;
    case "ReferencedPaymentNonexistence":
      const arRef: ReferencedPaymentNonexistence_Request = {
        attestationType: encodeAttestationName(atType),
        sourceId: encodeAttestationName(sourceId),
        messageIntegrityCode: MIC,
        requestBody: {
          minimalBlockNumber: "2",
          deadlineBlockNumber: "5",
          deadlineTimestamp: "5312",
          destinationAddressHash: ethers.zeroPadBytes("0x123456", 32),
          amount: "100",
          standardPaymentReference: ethers.zeroPadBytes("0x222222", 32),
        }
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
    transactionHash: ethers.zeroPadBytes("0x00012345", 32),
    blockHash: ethers.zeroPadBytes("0x048240", 32),
    blockNumber: 12456,
  };
  return request;
}

export function createBlankBitVoteEvent(vote: string, timestamp = "1234"): BitVote {
  const returnData = {
    sender: ethers.zeroPadBytes("0x111111", 20),
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

export function createAttestationVerificationPair(defStore: AttestationDefinitionStore, reqId: string, round: number, logIndex: number, micOk: boolean, status: AttestationResponseStatus) {
  const id = Web3.utils.randomHex(32);
  const sender = Web3.utils.randomHex(32);

  const arPayment: Payment_Request = {
    attestationType: encodeAttestationName("Payment"),
    sourceId: encodeAttestationName("XRP"),
    messageIntegrityCode: ZERO_BYTES_32,
    requestBody: {
      transactionId: reqId,
      inUtxo: "0",
      utxo: "0",
    }
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

  const response: Payment_Response = {
    attestationType: arPayment.attestationType,
    sourceId: arPayment.sourceId,
    votingRound: round.toString(),
    lowestUsedTimestamp: "0",
    requestBody: {
      transactionId: "0x9F1ADBE4958AFE4D28138C22B90DA0DBD4FE45BC72C222CB5B78D2F20F79E351".toLowerCase(),
      inUtxo: "0",
      utxo:  "0",  
    },
    responseBody: {
      blockNumber: "10",
      blockTimestamp: "109214",
      sourceAddressHash: prefix0x(Web3.utils.randomHex(32)),
      receivingAddressHash: prefix0x(Web3.utils.randomHex(32)),
      intendedReceivingAddressHash: prefix0x(Web3.utils.randomHex(32)),
      spentAmount: "13",
      intendedSpentAmount: "13",
      receivedAmount: "12",
      intendedReceivedAmount: "12",
      standardPaymentReference: ZERO_BYTES_32,
      oneToOne: true,
      status: "0",    
    }
  };

  // const verification: Verification<ARPayment, DHPayment> = {
  //   hash: prefix0x(Web3.utils.randomHex(32)),
  //   request: arPayment,
  //   response: response,
  //   status: status,
  // };

  const verification: AttestationResponse<Payment_Response> = {
    status,
    response,
  }
  
  if (micOk) {
    const mic = defStore.attestationResponseHash(response, MIC_SALT);
    arPayment.messageIntegrityCode = mic;
    const reqData = defStore.encodeRequest(arPayment);
    request.returnValues.data = reqData;
  }

  const attData = new AttestationData(request);

  const attestation = new Attestation(round, attData);

  return { attestation, verification };
}
