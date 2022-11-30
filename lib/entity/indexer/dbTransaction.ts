import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

/**
 * Format for storing transaction data in indexer database
 */
export class DBTransactionBase extends BaseEntity {
  @Column() @Index() chainType: number = 0;

  @Column({ type: "varchar", length: 64 }) @Index() transactionId: string = "";

  @Column() @Index() blockNumber: number = 0;

  @Column() @Index() timestamp: number = 0;

  @Column({ type: "varchar", length: 64 }) @Index() paymentReference: string = "";

  @Column({ type: "text" }) response: string = "";

  @Column() @Index() isNativePayment: boolean = false;

  @Column({ type: "varchar", length: 64 }) @Index() transactionType: string = "";
}

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
