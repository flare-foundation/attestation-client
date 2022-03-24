import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

@Entity({ name: "attestation_request" })


export class DBAttestationRequest extends BaseEntity {
    @Column() @Index() roundId: number = 0;
    @Column() @Index() blockNumber: string = "";
    @Column() @Index() logIndex: number = 0;

    @Column() requestBytes: string = "";
    @Column() request: string = "";
    @Column() verificationStatus: string = "";
    @Column() response: string = "";
    @Column() exceptionError: string = "";
    @Column() hashData: string = "";
}
