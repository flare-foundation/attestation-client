// (c) 2021, Flare Networks Limited. All rights reserved.
// Please see the file LICENSE for licensing terms.

// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

// import "hardhat/console.sol";

contract HashTest {
  function testFassetProof(
    uint32 typ,
    uint64 chainId,
    uint64 blockNumber,
    bytes32 txId,
    // uint16 utxo,
    string calldata sourceAddress,
    string calldata destinationAddress,
    uint256 destinationTag,
    uint256 spent,
    uint256 received,
    bytes32 hashToProve
  ) external pure returns (bool _match) {
    bytes32 hash = keccak256(abi.encode(
      typ,
      chainId,
      blockNumber,
      txId,
      // utxo,
      sourceAddress,
      destinationAddress,
      destinationTag,
      spent,
      received
    ));
    return hash == hashToProve;
  }


  function testDecreaseBalanceProof(
    uint32 typ,
    uint64 chainId,
    uint64 blockNumber,
    bytes32 txId,
    string calldata sourceAddress,
    uint256 spent,
    bytes32 hashToProve
  ) external pure returns (bool _match) {
    bytes32 hash = keccak256(abi.encode(
      typ,
      chainId,
      blockNumber,
      txId,
      sourceAddress,
      spent
    ));
    return hash == hashToProve;
  }

  function verifyMerkleProof(
    bytes32 txHash, 
    uint256[] calldata sides, 
    bytes32[] calldata hashes, 
    bytes32 targetHash
  ) external pure returns (bool _match) {
    bytes32 currentHash = txHash;
    
    for(uint256 i = 0; i < sides.length; i++) {
      if(sides[i] == 0) {
        currentHash = keccak256(abi.encode(hashes[i], currentHash));
      } else {
        currentHash = keccak256(abi.encode(currentHash, hashes[i]));
      }      
    }
    return currentHash == targetHash;
  }
}
