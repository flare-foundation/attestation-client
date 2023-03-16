import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

/**
 * Query parameters for listing transactions from indexer database.
 */
export class QueryTransaction {
   /**
    * Minimal block number of query range
    */
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   from?: number;
   /**
    * Maximal block number of the query range
    */
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   to?: number;
   /**
    * 0x-prefixed lowercase hex string representing 32-bytes
    */
   @IsOptional()
   paymentReference?: string;
   /**
    * Query limit. Capped by server config settings
    */
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   limit?: number;
   /**
    * Query offset
    */
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   offset?: number;
   /**
    * Whether response from node stored in the indexer database should be returned
    */
   @IsOptional()
   @Transform(({value}) => value === "true")
   returnResponse?: boolean;
}
