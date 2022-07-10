import { optional } from "@flarenetwork/mcc";

export class ServerUser {
    name: string = "";
    auth: string = "";
    @optional() ip: string = "";
}