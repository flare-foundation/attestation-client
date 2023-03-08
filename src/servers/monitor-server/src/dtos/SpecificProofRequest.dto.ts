import { ApiProperty } from "@nestjs/swagger";

export class SpecificProofRequest {
   @ApiProperty()
   roundId: number;

   @ApiProperty()   
   callData: string;
 }