//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";
import Web3 from "web3";
import { ChainType, toBN } from "flare-mcc";
import { randSol } from "../attestation-types/attestation-types-helpers";
import { 
   ARPayment,
   ARBalanceDecreasingTransaction,
   ARBlockHeightExists,
   ARReferencedPaymentNonexistence,
   ARType 
} from "./attestation-request-types";
import {
   DHPayment,
   DHBalanceDecreasingTransaction,
   DHBlockHeightExists,
   DHReferencedPaymentNonexistence,
   DHType 
} from "./attestation-hash-types";
import { AttestationType } from "./attestation-types-enum";
  

export function randomResponsePayment() {
   let response = {
      blockNumber: randSol({}, "blockNumber", "uint64") as BN,
      blockTimestamp: randSol({}, "blockTimestamp", "uint64") as BN,
      transactionHash: randSol({}, "transactionHash", "bytes32") as string,
      utxo: randSol({}, "utxo", "uint8") as BN,
      sourceAddress: randSol({}, "sourceAddress", "bytes32") as string,
      receivingAddress: randSol({}, "receivingAddress", "bytes32") as string,
      paymentReference: randSol({}, "paymentReference", "bytes32") as string,
      spentAmount: randSol({}, "spentAmount", "int256") as BN,
      receivedAmount: randSol({}, "receivedAmount", "uint256") as BN,
      oneToOne: randSol({}, "oneToOne", "bool") as boolean,
      status: randSol({}, "status", "uint8") as BN      
   } as DHPayment;
   return response;
}

export function randomResponseBalanceDecreasingTransaction() {
   let response = {
      blockNumber: randSol({}, "blockNumber", "uint64") as BN,
      blockTimestamp: randSol({}, "blockTimestamp", "uint64") as BN,
      transactionHash: randSol({}, "transactionHash", "bytes32") as string,
      sourceAddress: randSol({}, "sourceAddress", "bytes32") as string,
      spentAmount: randSol({}, "spentAmount", "int256") as BN,
      paymentReference: randSol({}, "paymentReference", "bytes32") as string      
   } as DHBalanceDecreasingTransaction;
   return response;
}

export function randomResponseBlockHeightExists() {
   let response = {
      blockNumber: randSol({}, "blockNumber", "uint64") as BN,
      blockTimestamp: randSol({}, "blockTimestamp", "uint64") as BN      
   } as DHBlockHeightExists;
   return response;
}

export function randomResponseReferencedPaymentNonexistence() {
   let response = {
      endTimestamp: randSol({}, "endTimestamp", "uint64") as BN,
      endBlock: randSol({}, "endBlock", "uint64") as BN,
      destinationAddress: randSol({}, "destinationAddress", "bytes32") as string,
      paymentReference: randSol({}, "paymentReference", "bytes32") as string,
      amount: randSol({}, "amount", "uint128") as BN,
      firstCheckedBlock: randSol({}, "firstCheckedBlock", "uint64") as BN,
      firstCheckedBlockTimestamp: randSol({}, "firstCheckedBlockTimestamp", "uint64") as BN,
      firstOverflowBlock: randSol({}, "firstOverflowBlock", "uint64") as BN,
      firstOverflowBlockTimestamp: randSol({}, "firstOverflowBlockTimestamp", "uint64") as BN      
   } as DHReferencedPaymentNonexistence;
   return response;
}
//////////////////////////////////////////////////////////////
// Random attestation requests and resposes. Used for testing.
//////////////////////////////////////////////////////////////

export function getRandomResponseForType(attestationType: AttestationType) {
   switch(attestationType) {
      case AttestationType.Payment:
         return randomResponsePayment();
      case AttestationType.BalanceDecreasingTransaction:
         return randomResponseBalanceDecreasingTransaction();
      case AttestationType.BlockHeightExists:
         return randomResponseBlockHeightExists();
      case AttestationType.ReferencedPaymentNonexistence:
         return randomResponseReferencedPaymentNonexistence();
      default:
         throw new Error("Wrong attestation type.")
  }   
}

export function getRandomRequest() {  
   let ids = [1, 2, 3, 4];
   let randomAttestationType: AttestationType = ids[Math.floor(Math.random()*4)];
   let chainId: ChainType = ChainType.invalid;
   let chainIds: ChainType[] = [];
   switch(randomAttestationType) {
      case AttestationType.Payment:
         chainIds = [3,0,1,2,4];
         chainId = chainIds[Math.floor(Math.random()*5)];
         return {attestationType: randomAttestationType, chainId} as ARPayment;
      case AttestationType.BalanceDecreasingTransaction:
         chainIds = [3,0,1,2,4];
         chainId = chainIds[Math.floor(Math.random()*5)];
         return {attestationType: randomAttestationType, chainId} as ARBalanceDecreasingTransaction;
      case AttestationType.BlockHeightExists:
         chainIds = [3,0,1,2,4];
         chainId = chainIds[Math.floor(Math.random()*5)];
         return {attestationType: randomAttestationType, chainId} as ARBlockHeightExists;
      case AttestationType.ReferencedPaymentNonexistence:
         chainIds = [3,0,1,2,4];
         chainId = chainIds[Math.floor(Math.random()*5)];
         return {attestationType: randomAttestationType, chainId} as ARReferencedPaymentNonexistence;
      default:
         throw new Error("Invalid attestation type");
   }
}

export function getRandomRequestForAttestationTypeAndChainId (
   attestationType: AttestationType,
   chainId: ChainType
) {  
   switch(attestationType) {
      case AttestationType.Payment:
         return {
            attestationType,
            chainId,
            blockNumber: toBN(Web3.utils.randomHex(4)),
            utxo: toBN(Web3.utils.randomHex(1)),
            inUtxo: toBN(Web3.utils.randomHex(1)),
            id: Web3.utils.randomHex(32),
            dataAvailabilityProof: Web3.utils.randomHex(32)
         } as ARPayment;
      case AttestationType.BalanceDecreasingTransaction:
         return {
            attestationType,
            chainId,
            inUtxo: toBN(Web3.utils.randomHex(1)),
            id: Web3.utils.randomHex(32),
            dataAvailabilityProof: Web3.utils.randomHex(32)
         } as ARBalanceDecreasingTransaction;
      case AttestationType.BlockHeightExists:
         return {
            attestationType,
            chainId,
            blockNumber: toBN(Web3.utils.randomHex(4)),
            dataAvailabilityProof: Web3.utils.randomHex(32)
         } as ARBlockHeightExists;
      case AttestationType.ReferencedPaymentNonexistence:
         return {
            attestationType,
            chainId,
            endTimestamp: toBN(Web3.utils.randomHex(4)),
            endBlock: toBN(Web3.utils.randomHex(4)),
            destinationAddress: Web3.utils.randomHex(32),
            amount: toBN(Web3.utils.randomHex(16)),
            paymentReference: toBN(Web3.utils.randomHex(32)),
            dataAvailabilityProof: Web3.utils.randomHex(32)
         } as ARReferencedPaymentNonexistence;
      default:
         throw new Error("Invalid attestation type");
   }
}
//////////////////////////////////////////////////////////////
// Hash functions for requests and responses for particular 
// Attestation types.
//////////////////////////////////////////////////////////////

export function hashPayment(request: ARPayment, response: DHPayment) {
   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint16",		// attestationType
         "uint32",		// chainId
         "uint64",		// blockNumber
         "uint64",		// blockTimestamp
         "bytes32",		// transactionHash
         "uint8",		// utxo
         "bytes32",		// sourceAddress
         "bytes32",		// receivingAddress
         "bytes32",		// paymentReference
         "int256",		// spentAmount
         "uint256",		// receivedAmount
         "bool",		// oneToOne
         "uint8",		// status
      ],
      [
         request.attestationType,
         request.chainId,
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
   return web3.utils.soliditySha3(encoded)!;
}

export function hashBalanceDecreasingTransaction(request: ARBalanceDecreasingTransaction, response: DHBalanceDecreasingTransaction) {
   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint16",		// attestationType
         "uint32",		// chainId
         "uint64",		// blockNumber
         "uint64",		// blockTimestamp
         "bytes32",		// transactionHash
         "bytes32",		// sourceAddress
         "int256",		// spentAmount
         "bytes32",		// paymentReference
      ],
      [
         request.attestationType,
         request.chainId,
         response.blockNumber,
         response.blockTimestamp,
         response.transactionHash,
         response.sourceAddress,
         response.spentAmount,
         response.paymentReference
      ]
   );
   return web3.utils.soliditySha3(encoded)!;
}

export function hashBlockHeightExists(request: ARBlockHeightExists, response: DHBlockHeightExists) {
   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint16",		// attestationType
         "uint32",		// chainId
         "uint64",		// blockNumber
         "uint64",		// blockTimestamp
      ],
      [
         request.attestationType,
         request.chainId,
         response.blockNumber,
         response.blockTimestamp
      ]
   );
   return web3.utils.soliditySha3(encoded)!;
}

export function hashReferencedPaymentNonexistence(request: ARReferencedPaymentNonexistence, response: DHReferencedPaymentNonexistence) {
   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint16",		// attestationType
         "uint32",		// chainId
         "uint64",		// endTimestamp
         "uint64",		// endBlock
         "bytes32",		// destinationAddress
         "bytes32",		// paymentReference
         "uint128",		// amount
         "uint64",		// firstCheckedBlock
         "uint64",		// firstCheckedBlockTimestamp
         "uint64",		// firstOverflowBlock
         "uint64",		// firstOverflowBlockTimestamp
      ],
      [
         request.attestationType,
         request.chainId,
         response.endTimestamp,
         response.endBlock,
         response.destinationAddress,
         response.paymentReference,
         response.amount,
         response.firstCheckedBlock,
         response.firstCheckedBlockTimestamp,
         response.firstOverflowBlock,
         response.firstOverflowBlockTimestamp
      ]
   );
   return web3.utils.soliditySha3(encoded)!;
}

export function dataHash(request: ARType, response: DHType) {  
   switch(request.attestationType) {
      case AttestationType.Payment:
         return hashPayment(request as ARPayment, response as DHPayment);
      case AttestationType.BalanceDecreasingTransaction:
         return hashBalanceDecreasingTransaction(request as ARBalanceDecreasingTransaction, response as DHBalanceDecreasingTransaction);
      case AttestationType.BlockHeightExists:
         return hashBlockHeightExists(request as ARBlockHeightExists, response as DHBlockHeightExists);
      case AttestationType.ReferencedPaymentNonexistence:
         return hashReferencedPaymentNonexistence(request as ARReferencedPaymentNonexistence, response as DHReferencedPaymentNonexistence);
      default:
         throw new Error("Invalid attestation type");
   }
}
