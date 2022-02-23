import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base/BaseEntity";

@Entity({name:"state"})
export class DBState {

    @PrimaryColumn({type: "string"})
    name!: string;

    @Column()
    valueString!: string;

    @Column()
    valueNumber!: number;
}




