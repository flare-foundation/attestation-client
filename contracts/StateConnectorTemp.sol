// (c) 2022, Flare Networks Limited. All rights reserved.
// Please see the file LICENSE for licensing terms.

// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

contract StateConnectorTemp {

//====================================================================
// Data Structures
//====================================================================

    // unused old storage slots (genesis contract upgrade)
    uint256[16] private gap;

    // Signalling block.coinbase value
    address public constant SIGNAL_COINBASE = address(0x00000000000000000000000000000000000DEaD1);
    // Thu Dec 01 2022 00:00:00 GMT+0000
    uint256 public constant BUFFER_TIMESTAMP_OFFSET = 1669852800 seconds;
    // Amount of time a buffer is active before cycling to the next one
    uint256 public constant BUFFER_WINDOW = 60 seconds;
    // {Requests, Choose, Votes, Reveals}
    uint256 public constant TOTAL_STORED_BUFFERS = 4;
    // Store a proof for one week
    uint256 public constant TOTAL_STORED_PROOFS = (1 weeks) / BUFFER_WINDOW;
    // Cold wallet address => Hot wallet address
    mapping(address => address) public attestorAddressMapping;

    //=======================
    // VOTING DATA STRUCTURES
    //=======================

    // Voting round consists of 5 sequential buffer windows: collect, choose, commit, reveal, finalize
    // Round ID is the buffer number of the window of the collect phase 
    // Struct for Vote in buffer number 'N'
    struct Vote { 
        // Hash of the Merkle root (+ random number and msg.sender) that contains valid requests from 'Round ID = N-2' 
        bytes32 commitHash;
        // Merkle root for 'Round ID = N-3' used for commitHash in buffer number 'N-2'
        bytes32 merkleRoot;
        // Random number for 'Round ID = N-3' used for commitHash in buffer number 'N-2'
        bytes32 randomNumber;
    }
    struct Buffers {
        // {Requests, Votes, Reveals}
        Vote[TOTAL_STORED_BUFFERS] votes;
        // The latest buffer number that this account has voted on, used for determining relevant votes
        uint256 latestVote;
    }
    mapping(address => Buffers) public buffers;

    //=============================
    // MERKLE PROOF DATA STRUCTURES
    //=============================

    // The total number of buffers that have elapsed over time such that the latest buffer
    // has been proven using finaliseRound()
    uint256 public totalBuffers;
    // The proven merkle roots for each Round ID,
    // accessed using: Round ID % TOTAL_STORED_PROOFS
    // within one week of proving the merkle root.
    bytes32[TOTAL_STORED_PROOFS] public merkleRoots;

    // TMP S
    // Temporay updas to surpas the go code and test state connecotr using bots
    address public finalizingBot;
    // TMP E

//====================================================================
// Events
//====================================================================

    event AttestationRequest(
        address sender,
        uint256 timestamp,
        bytes data
    );

    event AttestationSubmit(
        address indexed sender,
        uint256 indexed bufferNumber,
        bytes32 commitHash,
        bytes32 merkleRoot,
        bytes32 randomNumber,
        bytes data
    );

    event RoundFinalised(
        uint256 indexed roundId,
        bytes32 merkleRoot
    );

//====================================================================
// Constructor
//====================================================================

    // TMP S
    constructor(address bot) {
        finalizingBot = bot;
    }
    // TMP E

//====================================================================
// Functions
//====================================================================  

    function updateAttestorAddressMapping(address _updatedAddress) external {
        attestorAddressMapping[msg.sender] = _updatedAddress;
    }

    function requestAttestations(bytes calldata _data) external {
        emit AttestationRequest(msg.sender, block.timestamp, _data); 
    }

    function submitAttestation(
        uint256 _bufferNumber,
        bytes32 _commitHash,
        bytes32 _merkleRoot,
        bytes32 _randomNumber,
        bytes calldata _chooseBytes
    ) 
        external returns (
            bool _isInitialBufferSlot
        )
    {
        require(_bufferNumber == (block.timestamp - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW, "wrong bufferNumber");
        emit AttestationSubmit(msg.sender,_bufferNumber,_commitHash,_merkleRoot,_randomNumber,_chooseBytes);
        buffers[msg.sender].latestVote = _bufferNumber;
        buffers[msg.sender].votes[_bufferNumber % TOTAL_STORED_BUFFERS] = Vote(
            _commitHash,
            _merkleRoot,
            _randomNumber
        );
        // Determine if this is the first attestation submitted in a new buffer round.
        // If so, the golang code will automatically finalise the previous round using finaliseRound()
        if (_bufferNumber > totalBuffers) {
            return true;
        }
        return false;
    }

    // TMP S
    function getAttestation(uint256 _bufferNumber, address assigner) external view returns (bytes32 _merkleRoot) {
        address attestor = attestorAddressMapping[assigner];
        if (attestor == address(0)) {
            attestor = assigner;
        }
        require(_bufferNumber > 1, "bufferNumber < 2");
        uint256 prevBufferNumber = _bufferNumber - 1;
        require(buffers[attestor].latestVote >= prevBufferNumber, "no vote for saved buffer yet");
        bytes32 commitHash = buffers[attestor].votes[(prevBufferNumber - 1) % TOTAL_STORED_BUFFERS].commitHash;
        _merkleRoot = buffers[attestor].votes[prevBufferNumber % TOTAL_STORED_BUFFERS].merkleRoot;
        bytes32 randomNumber = buffers[attestor].votes[prevBufferNumber % TOTAL_STORED_BUFFERS].randomNumber;
        require(commitHash == keccak256(abi.encode(_merkleRoot, randomNumber, attestor)), "unsucesfull finalisation");
    }
    // TMP E

    function finaliseRound(uint256 _bufferNumber, bytes32 _merkleRoot) external {
        require(_bufferNumber > 4);
        require(_bufferNumber == (block.timestamp - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
        require(_bufferNumber > totalBuffers);
        // The following region can only be called from the golang code
        // TMP S
        if (msg.sender == finalizingBot) {
            totalBuffers = _bufferNumber;
            merkleRoots[(_bufferNumber - 4) % TOTAL_STORED_PROOFS] = _merkleRoot;
            emit RoundFinalised(_bufferNumber - 4, _merkleRoot);
        }
        // TMP E
    }

    function lastFinalizedRoundId() external view returns (uint256 _roundId) {
        require(totalBuffers >= 4, "totalBuffers < 4");
        return totalBuffers - 4;
    }

    function merkleRoot(uint256 _roundId) external view returns (bytes32) {
        require(totalBuffers >= 4, "totalBuffers < 4");
        require(_roundId <= totalBuffers - 4, "not finalized");
        require(_roundId < TOTAL_STORED_PROOFS || _roundId > totalBuffers - 4 - TOTAL_STORED_PROOFS, "expired");
        return merkleRoots[_roundId % TOTAL_STORED_PROOFS];
    }
}