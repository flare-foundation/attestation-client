import { Column, Entity, Index, PrimaryColumn, Unique } from "typeorm";
import { BaseEntity } from "./base/BaseEntity";

// @Entity({name:"block"})
export class DBBlockBase {

    @PrimaryColumn({ type: "string" })
    blockHash!: string;

    @Column()
    @Index()
    blockNumber!: number;


    @Column()
    @Index()
    timestamp!: number;

    @Column()
    confirmed: boolean;

    @Column()
    response!: string;

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
