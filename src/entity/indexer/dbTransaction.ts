import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { decompressBin } from "../../utils/compression/compression";
import { BaseEntity } from "../base/BaseEntity";
import { TransactionResult } from "../../indexed-query-manager/indexed-query-manager-types";
import { getGlobalLogger } from "../../utils/logging/logger";
import { ChainType, IUtxoGetTransactionRes, IUtxoVinTransactionCoinbase, IUtxoVinTransactionPrevout, IUtxoVoutTransaction } from "@flarenetwork/mcc";
import { ApiDBTransaction } from "../../servers/verifier-server/src/dtos/indexer/ApiDbTransaction";

/**
 * Format for storing transaction data in indexer database
 */
export class DBTransactionBase extends BaseEntity {
  @Column() @Index() chainType: number = -1;

  @Column({ type: "varchar", length: 64 }) @Index() transactionId: string = "";

  @Column() @Index() blockNumber: number = 0;

  @Column() @Index() timestamp: number = 0;

  @Column({ type: "varchar", length: 64 }) @Index() paymentReference: string = "";

  @Column({ type: process.env.SQLITE ? "blob" : "longblob" }) response: Buffer = Buffer.from("");

  @Column() @Index() isNativePayment: boolean = false;

  @Column({ type: "varchar", length: 64 }) @Index() transactionType: string = "";

  public getResponse(): string {
    try {
      if (this.transactionType == "EMPTY_BLOCK_INDICATOR") {
        return "{}";
      }
      if (this.response.length == 0) {
        return "{}";
      }
      return decompressBin(this.response);
    } catch (error) {
      getGlobalLogger().exception(`Failed to decompress transaction response: ${error}`);
    }
  }

  // public getResponse(): string {
  //   return decompressBin(this.response);
  // }
}

export type IDBTransactionBase = new () => DBTransactionBase;

@Entity({ name: "xrp_transactions0" })
export class DBTransactionXRP0 extends DBTransactionBase {}
@Entity({ name: "xrp_transactions1" })
export class DBTransactionXRP1 extends DBTransactionBase {}

@Entity({ name: "btc_transactions0" })
export class DBTransactionBTC0 extends DBTransactionBase {}
@Entity({ name: "btc_transactions1" })
export class DBTransactionBTC1 extends DBTransactionBase {}

@Entity({ name: "ltc_transactions0" })
export class DBTransactionLTC0 extends DBTransactionBase {}
@Entity({ name: "ltc_transactions1" })
export class DBTransactionLTC1 extends DBTransactionBase {}

@Entity({ name: "doge_transactions0" })
export class DBTransactionDOGE0 extends DBTransactionBase {}
@Entity({ name: "doge_transactions1" })
export class DBTransactionDOGE1 extends DBTransactionBase {}

@Entity({ name: "algo_transactions0" })
export class DBTransactionALGO0 extends DBTransactionBase {}
@Entity({ name: "algo_transactions1" })
export class DBTransactionALGO1 extends DBTransactionBase {}

// External Postgres Database Entities (DOGE) (read only)

export type IDBDogeTransaction = new () => DBDogeTransaction;

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
        // TODO: This may lose precision
        value: parseFloat(transaction_output.value),
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
            // TODO: This may lose precision
            value: parseFloat(transaction_inp.value),
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
      hash: this.transactionId, // TODO: not always the same
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
      response: ""
    };
    if (returnResponse) {
      return {
        ...baseRes,
        response: JSON.stringify(this.response),
      };
    }
    return baseRes;
  }
}

abstract class AbstractTransactionOutput {
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
