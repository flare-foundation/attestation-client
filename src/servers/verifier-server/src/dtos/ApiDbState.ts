/**
 * State table entry of the indexer database
 */
export class ApiDBState {
  /**
   * Entry name (key)
   */
  name: string;
  /**
   * String value of the entry
   */
  valueString?: string;

  /**
   * Number value of the entry
   */
  valueNumber?: number;

  /**
   * Timestamp of the last change of the entry.
   */
  timestamp: number;

  /**
   * Comment for entry (optional).
   */
  comment?: string;
}
