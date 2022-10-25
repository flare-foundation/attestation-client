import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

export class DBTransactionBase extends BaseEntity {
  @Column() @Index() chainType = 0;

  @Column({ type: "varchar", length: 64 }) @Index() transactionId = "";

  @Column() @Index() blockNumber = 0;

  @Column() @Index() timestamp = 0;

  @Column({ type: "varchar", length: 64 }) @Index() paymentReference = "";

  @Column({ type: "text" }) response = "";

  @Column() @Index() isNativePayment = false;

  @Column({ type: "varchar", length: 64 }) @Index() transactionType = "";
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
