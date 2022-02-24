import { Column, Entity, Index, PrimaryColumn, Unique } from "typeorm";
import { BaseEntity } from "./base/BaseEntity";

@Entity({name:"block"})
export class DBBlock {

    @PrimaryColumn({type: "string"})
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




