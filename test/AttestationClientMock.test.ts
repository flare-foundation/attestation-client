import { ChainType } from "flare-mcc";
import { hexlifyBN } from "../lib/verification/codegen/cg-utils";
import { DHPayment } from "../lib/verification/generated/attestation-hash-types";
import { ARPayment } from "../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../lib/verification/generated/attestation-types-enum";
import { getRandomResponseForType, hashPayment } from "../lib/verification/generated/attestation-utils";
import { AttestationClientSCInstance, StateConnectorMockInstance } from "../typechain-truffle";

const AttestationClientSC = artifacts.require("AttestationClientSC");
const StateConnectorMock = artifacts.require("StateConnectorMock");
const STATECONNECTOR_ROUND = 1;
const CHAIN_ID = ChainType.BTC;

describe("Attestestation Client Mock", function () {
  let attestationClient: AttestationClientSCInstance;
  let stateConnectorMock: StateConnectorMockInstance;
  beforeEach(async () => {
    stateConnectorMock = await StateConnectorMock.new();
    attestationClient = await AttestationClientSC.new(stateConnectorMock.address);
  });

  it("'Payment' test", async function () {
    let attestationType = AttestationType.Payment;
    let stateConnectorRound = 0;
    let request = { attestationType, chainId: CHAIN_ID } as ARPayment;

    let response = getRandomResponseForType(attestationType) as DHPayment;
    response.stateConnectorRound = STATECONNECTOR_ROUND;
    response.merkleProof = [];

    let responseHex = hexlifyBN(response);

    let hash = hashPayment(request, response);

    let dummyHash = web3.utils.randomHex(32);
    await stateConnectorMock.setMerkleRoot(stateConnectorRound, hash);    
    assert(await stateConnectorMock.merkleRoots(stateConnectorRound) === hash);
    assert(await attestationClient.verifyPayment(CHAIN_ID, responseHex))

    await stateConnectorMock.setMerkleRoot(stateConnectorRound, dummyHash);
    assert(await attestationClient.verifyPayment(CHAIN_ID, responseHex) === false);
  });
});
