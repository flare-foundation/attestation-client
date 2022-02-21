import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./base/BaseEntity";

@Entity({name:"block"})
export class DBBlock extends BaseEntity {

    @Column()
    @Index()
    blockNumber!: number;

    @Column()
    @Index()
    blockHash!: string;

    @Column()
    @Index()
    timestamp!: number;

    @Column()
    confirmed: boolean;

    @Column()
    response!: string;

}




