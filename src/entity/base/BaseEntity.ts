import { PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseEntity {
  /**
   * Auto incremented id
   */
  @PrimaryGeneratedColumn({ type: "int" })
  id: number;
}
