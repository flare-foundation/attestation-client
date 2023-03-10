// (c) 2021, Flare Networks Limited. All rights reserved.
// Please see the file LICENSE for licensing terms.

// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

contract BitVotingTest {

//====================================================================
// Data Structures
//====================================================================

    // unused old storage slots (genesis contract upgrade)
    uint256[16] private gap;

    // November 5th, 2021
    uint256 public constant BUFFER_TIMESTAMP_OFFSET = 1636070400 seconds;
    // Amount of time a buffer is active before cycling to the next one
    uint256 public constant BUFFER_WINDOW = 16 seconds;
    // Relative deadline time for bit vote withing buffer window
    uint256 public constant BIT_VOTE_DEADLINE = 8 seconds;

//====================================================================
// Events
//====================================================================

    event BitVote(
        address sender,
        uint256 timestamp,
        bytes data
    );

//====================================================================
// Constructor
//====================================================================

    constructor() {
        /* empty block */
    }

//====================================================================
// Functions
//====================================================================  


    function submitVote(
        uint256 _bufferNumber,
        bytes calldata _bitVote
    ) external        
    {
        require(_bufferNumber == (block.timestamp - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW, "wrong bufferNumber");
        require(block.timestamp <= ((block.timestamp - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW) * BUFFER_WINDOW + BUFFER_TIMESTAMP_OFFSET + BIT_VOTE_DEADLINE, "bit vote deadline passed");
        emit BitVote(msg.sender, block.timestamp, _bitVote);
    }

}