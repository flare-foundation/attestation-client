//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

      //////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

// (c) 2021, Flare Networks Limited. All rights reserved.
// Please see the file LICENSE for licensing terms.

// SPDX-License-Identifier: MIT
//pragma solidity 0.7.6;
pragma solidity 0.8.11;
// Should use open zepplin version 3.4.0
// Newer versions require Solidity ^0.8.0
// import {MerkleProof} from "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// import "hardhat/console.sol";

contract HashTest {
   using MerkleProof for bytes32[];

   struct Payment {
      uint64 blockNumber;
      uint64 blockTimestamp;
      bytes32 transactionHash;
      uint8 utxo;
      bytes32 sourceAddress;
      bytes32 receivingAddress;
      uint256 paymentReference;
      int256 spentAmount;
      uint256 receivedAmount;
      bool oneToOne;
      uint8 status;
   }

   struct BalanceDecreasingTransaction {
      uint64 blockNumber;
      uint64 blockTimestamp;
      bytes32 transactionHash;
      bytes32 sourceAddress;
      int256 spentAmount;
      uint256 paymentReference;
   }

   struct BlockHeightExists {
      uint64 blockNumber;
      uint64 blockTimestamp;
   }

   struct ReferencedPaymentNonexistence {
      uint64 endTimestamp;
      uint64 endBlock;
      bytes32 destinationAddress;
      uint128 paymentReference;
      uint128 amount;
      uint64 firstCheckedBlock;
      uint64 firstCheckedBlockTimestamp;
      uint64 firstOverflowBlock;
      uint64 firstOverflowBlockTimestamp;
   }
 

   function hashTestPayment(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      Payment memory data = abi.decode(_data, (Payment));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.blockNumber,data.blockTimestamp,data.transactionHash,data.utxo,data.sourceAddress,data.receivingAddress,data.paymentReference,data.spentAmount,data.receivedAmount,data.oneToOne,data.status));
      return hash == _hashToProve && hash == hash2;
    }

   function hashTestBalanceDecreasingTransaction(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      BalanceDecreasingTransaction memory data = abi.decode(_data, (BalanceDecreasingTransaction));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.blockNumber,data.blockTimestamp,data.transactionHash,data.sourceAddress,data.spentAmount,data.paymentReference));
      return hash == _hashToProve && hash == hash2;
    }

   function hashTestBlockHeightExists(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      BlockHeightExists memory data = abi.decode(_data, (BlockHeightExists));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.blockNumber,data.blockTimestamp));
      return hash == _hashToProve && hash == hash2;
    }

   function hashTestReferencedPaymentNonexistence(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      ReferencedPaymentNonexistence memory data = abi.decode(_data, (ReferencedPaymentNonexistence));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.endTimestamp,data.endBlock,data.destinationAddress,data.paymentReference,data.amount,data.firstCheckedBlock,data.firstCheckedBlockTimestamp,data.firstOverflowBlock,data.firstOverflowBlockTimestamp));
      return hash == _hashToProve && hash == hash2;
    }


   function verifyMerkleProof(
      bytes32[] calldata proof,
      bytes32 merkleRoot,
      bytes32 leaf
   ) external pure returns (bool) {
      return proof.verify(merkleRoot, leaf);
   }

}
   
      