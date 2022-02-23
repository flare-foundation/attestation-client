
import { ChainType, IUtxoGetTransactionRes, MCC } from "flare-mcc";
import { VerificationStatus } from "../lib/verification/attestation-types/attestation-types";
import { AttestationType } from "../lib/verification/generated/attestation-types-enum";
import { StateConnectorInstance } from "../typechain-truffle";
import { testUtxo, traverseAndTestUtxoChain, UtxoTraverseTestOptions } from "./utils/test-utils";

const CHAIN = ChainType.BTC;
const URL = 'https://bitcoin.flare.network/';
const USERNAME = "flareadmin";
const PASSWORD = "mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4=";

// const ATTESTATION_TYPES = [AttestationType.FassetPaymentProof, AttestationType.BalanceDecreasingProof];
const ATTESTATION_TYPES = [AttestationType.Payment];

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

  it("Should extract correct payment reference based on OP_RETURN", async () => {
    // see: https://bitcoin.stackexchange.com/questions/29554/explanation-of-what-an-op-return-transaction-looks-like
    let targetPaymentReference = "636861726c6579206c6f766573206865696469";
    let response = await client.getTransaction("8bae12b5f4c088d940733dcd1455efc6a3a69cf9340e17a981286d3778615684", {verbose: true}) as IUtxoGetTransactionRes;
    console.log(response.vout[0].scriptPubKey.asm);
    let payementReference = (response.vout[0].scriptPubKey.asm as string).slice(10);
    assert(targetPaymentReference === payementReference);
  });

  // it("Should return FUNDS_INCREASED", async () => {
  //   await testUtxo(client, stateConnector, ChainType.BTC,
  //     "0x8e4e680920a472533854f75bf04f25d1dab233207672ff22db6a691b4fa185ac",
  //     718109,
  //     0,
  //     VerificationStatus.FUNDS_INCREASED
  //   )
  // });

  // it("Should return FORBIDDEN_SELF_SENDING", async () => {
  //   await testUtxo(client, stateConnector, ChainType.BTC,
  //     "0xeb4c98eabb6325aaa424451485ced7cc2c1a7c55aa564ed9f4e9b93b74a95ef8",
  //     718115,
  //     0,
  //     VerificationStatus.FORBIDDEN_SELF_SENDING
  //   )
  // });


  // it.only("Should return NOT_SINGLE_DESTINATION_ADDRESS", async () => {
  //   await testUtxo(client, stateConnector, ChainType.BTC,
  //     "0x642ac657335c3d3ccc61a569f769aa754c0fda6a7155603b8ba12bfc4708fa6e",
  //     718115,
  //     0,
  //     VerificationStatus.OK
  //   )
  // });

  it("Should return EMPTY_IN_ADDRESS", async () => { /// Multiple OP return
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0x036b40d81875cdd8dfb4f4e114910309173a2d24cf008a6d9febb1ffdd569ea4",
      718115,
      0,
      VerificationStatus.OK
    )
  });

  it("Should pass if only coinbase input and multiple OP_RETURN", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0xd1bf731559a786908848d4f7f3fb3fa2b66b1ac290aeba9570833b99b903dcc2",
      721450,
      0,
      VerificationStatus.OK
    )
  });

  it("Should return UNSUPPORTED_DESTINATION_ADDRESS", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0xceb8b1b28a12441d924b1443efbb282eec88d8dbd2790b93199cac0add6a0f22",
      718261,
      2,
      VerificationStatus.UNSUPPORTED_DESTINATION_ADDRESS
    )
  });

  it("Should return WRONG_OUT_UTXO", async () => {
    await testUtxo(client, stateConnector, ChainType.BTC,
      "0xceb8b1b28a12441d924b1443efbb282eec88d8dbd2790b93199cac0add6a0f22",
      718261,
      4,
      VerificationStatus.WRONG_OUT_UTXO
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
