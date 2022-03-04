import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base/BaseEntity";

@Entity({name:"state"})
export class DBState {

    @PrimaryColumn({type: "varchar"})
    name!: string;

    @Column()
    valueString: string="";

    @Column()
    valueNumber: number=0;
}




