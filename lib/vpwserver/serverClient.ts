import { optional } from "@flarenetwork/mcc";

export class ServerClient {
    name: string = "";
    auth: string = "";
    @optional() ip: string = "";
}