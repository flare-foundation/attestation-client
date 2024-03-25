import { Column, Entity, Index } from "typeorm";
import { decompressBin } from "../../utils/compression/compression";
import { BaseEntity } from "../base/BaseEntity";
import { getGlobalLogger } from "../../utils/logging/logger";

/**
 * Format for storing transaction data in indexer database
 */
export class DBTransactionBase extends BaseEntity {
  @Column() @Index() chainType: number = -1;

  @Column({ type: "varchar", length: 64 }) @Index() transactionId: string = "";

  @Column() @Index() blockNumber: number = 0;

  @Column() @Index() timestamp: number = 0;

  @Column({ type: "varchar", length: 64 }) @Index() paymentReference: string = "";

  @Column({ type: process.env.SQLITE ? "blob" : "bytea" }) response: Buffer = Buffer.from("");

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

@Entity({ name: "doge_transactions0" })
export class DBTransactionDOGE0 extends DBTransactionBase {}
@Entity({ name: "doge_transactions1" })
export class DBTransactionDOGE1 extends DBTransactionBase {}
