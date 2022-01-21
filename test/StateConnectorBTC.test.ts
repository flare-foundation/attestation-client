import { MCC } from "../lib/MCC";
import { ChainType } from "../lib/MCC/types";
import { AttestationType, VerificationStatus } from "../lib/verification/attestation-types";
import { StateConnectorInstance } from "../typechain-truffle";
import { testUtxo, traverseAndTestUtxoChain, UtxoTraverseTestOptions } from "./utils/test-utils";

const CHAIN = ChainType.BTC;
const URL = 'https://bitcoin.flare.network/';
const USERNAME = "flareadmin";
const PASSWORD = "mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4=";

// const ATTESTATION_TYPES = [AttestationType.FassetPaymentProof, AttestationType.BalanceDecreasingProof];
const ATTESTATION_TYPES = [AttestationType.FassetPaymentProof];

const FILTER_PRINTOUTS_FOR_STATUSES = [
  VerificationStatus.OK,
  VerificationStatus.FUNDS_INCREASED,
  VerificationStatus.FORBIDDEN_SELF_SENDING,
  VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS,
  VerificationStatus.EMPTY_IN_ADDRESS,
  VerificationStatus.WRONG_IN_UTXO
]

const StateConnector = artifacts.require("StateConnector");

describe(`Test ${MCC.getChainTypeName(CHAIN)}`, async () => {
  let client: MCC.BTC;
  let stateConnector: StateConnectorInstance;

  beforeEach(async () => {
    stateConnector = await StateConnector.new();
    client = MCC.Client(CHAIN, { url: URL, username: USERNAME, password: PASSWORD }) as MCC.BTC;
  });

  it("Should succeed", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0x68250d3c77a60ea0eb4f6c934c06cb01376f40abf6b7b098ba14d18516119594",
      718115,
      0,
      VerificationStatus.OK
    )
  });

  it("Should return FUNDS_INCREASED", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0x8e4e680920a472533854f75bf04f25d1dab233207672ff22db6a691b4fa185ac",
      718109,
      0,
      VerificationStatus.FUNDS_INCREASED
    )
  });

  it("Should return FORBIDDEN_SELF_SENDING", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0xeb4c98eabb6325aaa424451485ced7cc2c1a7c55aa564ed9f4e9b93b74a95ef8",
      718115,
      0,
      VerificationStatus.FORBIDDEN_SELF_SENDING
    )
  });


  it("Should return NOT_SINGLE_DESTINATION_ADDRESS", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0x642ac657335c3d3ccc61a569f769aa754c0fda6a7155603b8ba12bfc4708fa6e",
      718115,
      0,
      VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS
    )
  });

  it("Should return EMPTY_IN_ADDRESS", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0x036b40d81875cdd8dfb4f4e114910309173a2d24cf008a6d9febb1ffdd569ea4",
      718115,
      0,
      VerificationStatus.EMPTY_IN_ADDRESS
    )
  });

  it("Should return WRONG_IN_UTXO", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0xceb8b1b28a12441d924b1443efbb282eec88d8dbd2790b93199cac0add6a0f22",
      718261,
      2,
      VerificationStatus.WRONG_IN_UTXO
    )
  });

  it("Should make lots of attestation requests", async () => {
    await traverseAndTestUtxoChain(
      client, stateConnector, ChainType.BTC,
      {
        count: 1,
        attestationTypes: ATTESTATION_TYPES,
        filterStatusPrintouts: FILTER_PRINTOUTS_FOR_STATUSES,
        numberOfInputsChecked: 1
      } as UtxoTraverseTestOptions
    )
  });
});
