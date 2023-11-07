import { ChainType, IUtxoGetTransactionRes, IUtxoVinTransactionCoinbase, IUtxoVinTransactionPrevout, IUtxoVoutTransaction } from "@flarenetwork/mcc";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { BlockResult, TransactionResult } from "../indexed-query-manager/indexed-query-manager-types";
import { ApiDBBlock } from "../servers/verifier-server/src/dtos/indexer/ApiDbBlock";
import { ApiDBTransaction } from "../servers/verifier-server/src/dtos/indexer/ApiDbTransaction";

// External Postgres Database Entities (DOGE) (read only)

@Entity("doge_indexer_dogeblock")
export class DBDogeIndexerBlock {
  @PrimaryColumn({ type: "char" })
  blockHash!: string;

  @Column()
  blockNumber: number;

  @Column()
  timestamp: number;

  @Column()
  transactions: number;

  @Column()
  confirmed: boolean;

  @Column()
  previousBlockHash: string;

  toBlockResult(): BlockResult {
    return {
      blockNumber: this.blockNumber,
      blockHash: this.blockHash,
      timestamp: this.timestamp,
      transactions: this.transactions,
      confirmed: this.confirmed,
    };
  }

  toApiDBBlock(): ApiDBBlock {
    return {
      blockNumber: this.blockNumber,
      blockHash: this.blockHash,
      timestamp: this.timestamp,
      transactions: this.transactions,
      confirmed: this.confirmed,
      numberOfConfirmations: 0,
      previousBlockHash: this.previousBlockHash,
    };
  }
}

export type IDEDogeIndexerBlock = new () => DBDogeIndexerBlock;
@Entity("doge_indexer_dogetransaction")
export class DBDogeTransaction {
  @PrimaryColumn({ type: "char" })
  transactionId: string;

  @Column()
  blockNumber: number;

  @Column()
  timestamp: number;

  @Column()
  paymentReference: string;

  @Column()
  isNativePayment: boolean;

  @Column()
  transactionType: string;

  @OneToMany(() => DBTransactionOutput, (output) => output.transaction_link_id)
  transactionoutput_set: DBTransactionOutput[];

  @OneToMany(() => DBTransactionInputCoinbase, (cb_input) => cb_input.transaction_link_id)
  transactioninputcoinbase_set: DBTransactionInputCoinbase[];

  @OneToMany(() => DBTransactionInput, (input) => input.transaction_link_id)
  transactioninput_set: DBTransactionInput[];

  // Transaction methods
  private get response(): IUtxoGetTransactionRes {
    const vout_arr: IUtxoVoutTransaction[] = this.transactionoutput_set.map((transaction_output) => {
      return {
        value: transaction_output.value,
        n: transaction_output.n,
        scriptPubKey: {
          address: transaction_output.scriptKeyAddress,
          asm: transaction_output.scriptKeyAsm,
          hex: transaction_output.scriptKeyHex,
        },
      };
    });

    const vin_arr: IUtxoVinTransactionPrevout[] = this.transactioninput_set
      .sort((a, b) => {
        return a.vinN - b.vinN;
      })
      .map((transaction_inp) => {
        return {
          sequence: transaction_inp.vinSequence,
          txid: transaction_inp.vinPreviousTxid,
          vout: transaction_inp.vinVoutIndex,
          prevout: {
            value: transaction_inp.value,
            scriptPubKey: {
              address: transaction_inp.scriptKeyAddress,
              asm: transaction_inp.scriptKeyAsm,
              hex: transaction_inp.scriptKeyHex,
            },
          },
        };
      });

    const vin_cb_arr: IUtxoVinTransactionCoinbase[] = this.transactioninputcoinbase_set
      .sort((a, b) => {
        return a.vinN - b.vinN;
      })
      .map((transaction_inp) => {
        return {
          sequence: transaction_inp.vinSequence,
          coinbase: transaction_inp.vinCoinbase,
        };
      });

    const res_no_vin = {
      txid: this.transactionId,
      time: this.timestamp,
      vout: vout_arr,
      // non necessary stuff
      // TODO: Do we need them / update mcc with minimal required data
      blocktime: this.timestamp,
      hash: this.transactionId,
      version: 1,
      size: 0,
      vsize: 0,
      weight: 0,
      locktime: 0,
      hex: "",
      blockhash: "",
      confirmations: 0,
    };

    if (vin_cb_arr.length > 0) {
      return {
        ...res_no_vin,
        vin: vin_cb_arr,
      };
    }

    return {
      ...res_no_vin,
      vin: vin_arr,
    };
  }

  toTransactionResult(): TransactionResult {
    return {
      getResponse() {
        return JSON.stringify(this.response);
      },
      chainType: ChainType.DOGE,
      transactionId: this.transactionId,
      blockNumber: this.blockNumber,
      timestamp: this.timestamp,
      paymentReference: this.paymentReference,
      isNativePayment: this.isNativePayment,
      transactionType: this.transactionType,
    };
  }

  toApiDBTransaction(returnResponse: boolean = false): ApiDBTransaction {
    const baseRes = {
      id: 0,
      chainType: ChainType.DOGE,
      transactionId: this.transactionId,
      blockNumber: this.blockNumber,
      timestamp: this.timestamp,
      paymentReference: this.paymentReference,
      isNativePayment: this.isNativePayment,
      transactionType: this.transactionType,
      response: "",
    };
    if (returnResponse) {
      return {
        ...baseRes,
        response: this.response,
      };
    }
    return baseRes;
  }
}
// External Postgres Database Entities (DOGE) (read only)

export type IDBDogeTransaction = new () => DBDogeTransaction;
export abstract class AbstractTransactionOutput {
  @Column()
  n: number;

  @Column()
  value: string;

  @Column()
  scriptKeyAsm: string;

  @Column()
  scriptKeyHex: string;

  // TODO: probably needs to be updated to number or removed
  @Column()
  scriptKeyReqSigs: string;

  @Column()
  scriptKeyType: string;

  @Column()
  scriptKeyAddress: string;
}
@Entity("doge_indexer_transactionoutput")
export class DBTransactionOutput extends AbstractTransactionOutput {
  @PrimaryColumn({ type: "bigint" })
  id: string;

  @ManyToOne((type) => DBDogeTransaction, (transaction) => transaction.transactionoutput_set)
  @JoinColumn({ name: "transaction_link_id" })
  transaction_link_id: DBDogeTransaction;
}
@Entity("doge_indexer_transactioninputcoinbase")
export class DBTransactionInputCoinbase {
  @PrimaryColumn({ type: "bigint" })
  id: string;

  @ManyToOne((type) => DBDogeTransaction, (transaction) => transaction.transactionoutput_set)
  @JoinColumn({ name: "transaction_link_id" })
  transaction_link_id: DBDogeTransaction;

  @Column()
  vinN: number;

  @Column()
  vinCoinbase: string;

  @Column()
  vinSequence: number;
}

@Entity("doge_indexer_transactioninput")
export class DBTransactionInput extends AbstractTransactionOutput {
  @PrimaryColumn({ type: "bigint" })
  id: string;

  @ManyToOne((type) => DBDogeTransaction, (transaction) => transaction.transactionoutput_set)
  @JoinColumn({ name: "transaction_link_id" })
  transaction_link_id: DBDogeTransaction;

  @Column()
  vinN: number;

  @Column()
  vinPreviousTxid: string;

  @Column()
  vinVoutIndex: number;

  @Column()
  vinSequence: number;

  @Column()
  vinScriptSigAsm: string;

  @Column()
  vinScriptSigHex: string;
}
@Entity("doge_indexer_tipsyncstate")
export class TipSyncState {
  @PrimaryColumn({ type: "bigint" })
  id: string;

  @Column()
  syncState: string;

  @Column()
  latestTipHeight: number;

  @Column()
  latestIndexedHeight: number;

  @Column()
  timestamp: number;
}
// External Postgres Database Entities (DOGE) (read only)

export type ITipSyncState = new () => TipSyncState;


@Entity("doge_indexer_prunesyncstate")
export class PruneSyncState {
  @PrimaryColumn({ type: "bigint" })
  id: string;

  @Column()
  latestIndexedTailHeight: number;

  @Column()
  timestamp: number;
}
// External Postgres Database Entities (DOGE) (read only)

export type IPruneSyncState = new () => PruneSyncState;

