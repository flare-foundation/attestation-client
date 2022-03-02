//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { IndexerQueryHandler, Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00002-balance-decreasing-transaction";
import { ARBalanceDecreasingTransaction } from "../../generated/attestation-request-types";
import { DHBalanceDecreasingTransaction } from "../../generated/attestation-hash-types";
const web3 = new Web3();

export async function verifyBalanceDecreasingTransactionDOGE(client: RPCInterface, bytes: string, indexer: IndexerQueryHandler) {
   let request = parseRequestBytes(bytes, TDEF) as ARBalanceDecreasingTransaction;

   // Do the magic here and fill the response with the relevant data

   let response = {
         blockNumber: randSol(request, "blockNumber", "uint64") as BN,
         blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN,
         transactionHash: randSol(request, "transactionHash", "bytes32") as string,
         sourceAddress: randSol(request, "sourceAddress", "bytes32") as string,
         spentAmount: randSol(request, "spentAmount", "int256") as BN,
         paymentReference: randSol(request, "paymentReference", "uint256") as BN      
   } as DHBalanceDecreasingTransaction;
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint64",		// blockNumber
           "uint64",		// blockTimestamp
           "bytes32",		// transactionHash
           "bytes32",		// sourceAddress
           "int256",		// spentAmount
           "uint256",		// paymentReference
      ],
      [
          response.blockNumber,
          response.blockTimestamp,
          response.transactionHash,
          response.sourceAddress,
          response.spentAmount,
          response.paymentReference
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHBalanceDecreasingTransaction>;
}   
