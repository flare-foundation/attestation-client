// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "hardhat/console.sol";

contract CommitTest {
   function test(
      bytes32 merkleRoot,
      bytes32 maskedMerkleRoot,
      bytes32 committedRandom,
      bytes32 revealedRandom
   ) external pure returns (bytes32) {
      require(committedRandom == keccak256(abi.encodePacked(revealedRandom)), "Wrong random number");
      return maskedMerkleRoot ^ revealedRandom;
      // require((maskedMerkleRoot ^ revealedRandom) == merkleRoot, "Unmasked merkle root does not match");
      // return committedRandom == keccak256(abi.encodePacked(revealedRandom)) && (maskedMerkleRoot ^ revealedRandom) == merkleRoot;
      // return true;
   }
}
   
      