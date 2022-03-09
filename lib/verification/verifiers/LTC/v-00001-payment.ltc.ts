//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ARPayment, BN, DHPayment, IndexedQueryManager, parseRequestBytes, randSol, RPCInterface, TDEF_payment, Verification, VerificationStatus, Web3 } from "./0imports";

const web3 = new Web3();

export async function verifyPaymentLTC(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF_payment) as ARPayment;

   // Do the magic here and fill the response with the relevant data

   let response = {
         blockNumber: randSol(request, "blockNumber", "uint64") as BN,
         blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN,
         transactionHash: randSol(request, "transactionHash", "bytes32") as string,
         utxo: randSol(request, "utxo", "uint8") as BN,
         sourceAddress: randSol(request, "sourceAddress", "bytes32") as string,
         receivingAddress: randSol(request, "receivingAddress", "bytes32") as string,
         paymentReference: randSol(request, "paymentReference", "uint256") as BN,
         spentAmount: randSol(request, "spentAmount", "int256") as BN,
         receivedAmount: randSol(request, "receivedAmount", "uint256") as BN,
         oneToOne: randSol(request, "oneToOne", "bool") as boolean,
         status: randSol(request, "status", "uint8") as BN      
   } as DHPayment;
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint64",		// blockNumber
           "uint64",		// blockTimestamp
           "bytes32",		// transactionHash
           "uint8",		// utxo
           "bytes32",		// sourceAddress
           "bytes32",		// receivingAddress
           "uint256",		// paymentReference
           "int256",		// spentAmount
           "uint256",		// receivedAmount
           "bool",		// oneToOne
           "uint8",		// status
      ],
      [
          response.blockNumber,
          response.blockTimestamp,
          response.transactionHash,
          response.utxo,
          response.sourceAddress,
          response.receivingAddress,
          response.paymentReference,
          response.spentAmount,
          response.receivedAmount,
          response.oneToOne,
          response.status
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHPayment>;
}   
