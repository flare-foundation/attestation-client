import { ChainType } from "flare-mcc";
import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./base/BaseEntity";

export class DBTransactionBase extends BaseEntity {

    @Column({type: "varchar", length:32}) @Index() chainType: number = 0;

    @Column({type: "varchar", length:64}) @Index() transactionId: string = "";

    @Column() @Index() blockNumber: number = 0;

    @Column() @Index() blockTransactionIndex: number = 0;

    @Column() @Index() timestamp: number = 0;



    @Column({type: "varchar", length:64}) @Index() paymentReference: string = "";

    @Column({type: "varchar", length:64}) hashVerify: string = "";

    

    @Column({type: "text" }) response: string = "";
}

@Entity({ name: "transactions0" })
export class DBTransaction0 extends DBTransactionBase {
}

@Entity({ name: "transactions1" })
export class DBTransaction1 extends DBTransactionBase {
}




