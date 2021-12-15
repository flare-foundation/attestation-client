// (c) 2021, Flare Networks Limited. All rights reserved.
// Please see the file LICENSE for licensing terms.

// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

contract HashTest {
  function test(
    uint32 typ,
    uint64 chainId,
    uint64 blockNumber,
    bytes32 txId,
    uint16 utxo,
    string calldata sourceAddress,
    string calldata destinationAddress,
    uint256 destinationTag,
    uint256 amount,
    uint32 gas,
    bytes32 hashToProve
  ) external pure returns (bool _match) {
    bytes32 hash = keccak256(abi.encode(
      typ,
      chainId,
      blockNumber,
      txId,
      utxo,
      sourceAddress,
      destinationAddress,
      destinationTag,
      amount,
      gas
    ));
    return hash == hashToProve;
    // bytes32 location = keccak256(
    //   abi.encodePacked(
    //     keccak256(abi.encodePacked("FlareStateConnector_LOCATION")),
    //     keccak256(abi.encodePacked(chainId)),
    //     keccak256(abi.encodePacked(ledger)),
    //     keccak256(abi.encodePacked(txId)),
    //     keccak256(abi.encodePacked(utxo))
    //   )
    // );
    // bytes32 finalisedPaymentLocation = keccak256(abi.encodePacked(keccak256(abi.encodePacked("FlareStateConnector_FINALISED")), location));
    // bytes32 paymentHash = keccak256(
    //   abi.encodePacked(keccak256(abi.encodePacked("FlareStateConnector_PAYMENTHASH")), destinationHash, dataHash, keccak256(abi.encodePacked(amount)))
    // );
  }
}
