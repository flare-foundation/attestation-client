import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./base/BaseEntity";

@Entity({name:"state"})
export class DBState extends BaseEntity {

    @Column()
    @Index()
    name!: string;

    @Column()
    valueString!: string;

    @Column()
    valueNumber!: number;
}




