import { Column, Entity, Index, PrimaryColumn } from "typeorm";

// @Entity({name:"block"})
export class DBBlockBase {

    @PrimaryColumn({ type: "varchar" })
    blockHash!: string;

    @Column()
    @Index()
    blockNumber!: number;


    @Column()
    @Index()
    timestamp!: number;

    @Column()
    transactions: number = 0;


    @Column()
    confirmed: boolean = false;

    //@Column({ type: "text" }) response: string = "";
}


@Entity({ name: "btc_block" })
export class DBBlockBTC extends DBBlockBase {
}
@Entity({ name: "ltc_block" })
export class DBBlockLTC extends DBBlockBase {
}
@Entity({ name: "doge_block" })
export class DBBlockDOGE extends DBBlockBase {
}
@Entity({ name: "xrp_block" })
export class DBBlockXRP extends DBBlockBase {
}

@Entity({ name: "algo_block" })
export class DBBlockALGO extends DBBlockBase {
}
