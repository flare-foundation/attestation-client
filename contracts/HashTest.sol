
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
      uint16 attestationType;
      uint16 chainId;
      uint64 blockNumber;
      uint64 blockTimestamp;
      bytes32 txId;
      uint8 utxo;
      string sourceAddress;
      string destinationAddress;
      uint128 paymentReference;
      int256 spent;
      uint256 delivered;
      bool isToOne;
      uint8 status;
   }

   struct BalanceDecreasingPayment {
      uint16 attestationType;
      uint16 chainId;
      uint64 blockNumber;
      uint64 blockTimestamp;
      bytes32 txId;
      string sourceAddress;
      int256 spent;
   }

   struct BlockHeightExistence {
      uint16 attestationType;
      uint16 chainId;
      uint64 blockNumber;
      uint64 blockTimestamp;
      bytes32 blockHash;
   }

   struct ReferencedPaymentNonExistence {
      uint16 attestationType;
      uint16 chainId;
      uint64 endTimestamp;
      uint64 endBlock;
      uint128 paymentReference;
      uint128 amount;
      uint64 firstCheckedBlockTimestamp;
      uint64 firstCheckedBlock;
      uint64 firstOverflowBlockTimestamp;
      uint64 firstOverflowBlock;
   }
 

   function hashTestPayment(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      Payment memory data = abi.decode(_data, (Payment));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.attestationType,data.chainId,data.blockNumber,data.blockTimestamp,data.txId,data.utxo,data.sourceAddress,data.destinationAddress,data.paymentReference,data.spent,data.delivered,data.isToOne,data.status));
      return hash == _hashToProve && hash == hash2;
    }

   function hashTestBalanceDecreasingPayment(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      BalanceDecreasingPayment memory data = abi.decode(_data, (BalanceDecreasingPayment));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.attestationType,data.chainId,data.blockNumber,data.blockTimestamp,data.txId,data.sourceAddress,data.spent));
      return hash == _hashToProve && hash == hash2;
    }

   function hashTestBlockHeightExistence(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      BlockHeightExistence memory data = abi.decode(_data, (BlockHeightExistence));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.attestationType,data.chainId,data.blockNumber,data.blockTimestamp,data.blockHash));
      return hash == _hashToProve && hash == hash2;
    }

   function hashTestReferencedPaymentNonExistence(
      bytes memory _data,
      bytes32 _hashToProve
    ) external pure returns (bool _match) {
      bytes32 hash = keccak256(_data);
      ReferencedPaymentNonExistence memory data = abi.decode(_data, (ReferencedPaymentNonExistence));
      require(data.attestationType > 0);
      bytes32 hash2 = keccak256(abi.encode(data.attestationType,data.chainId,data.endTimestamp,data.endBlock,data.paymentReference,data.amount,data.firstCheckedBlockTimestamp,data.firstCheckedBlock,data.firstOverflowBlockTimestamp,data.firstOverflowBlock));
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
   
