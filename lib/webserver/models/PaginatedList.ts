export class PaginatedList<T> {
  /**
   * Count of all items satisfying 'paginatable' request.
   */
  count?: number;
  /**
   * Response items.
   */
  items?: T[];
  /**
   * Limit got from request
   */
  limit?: number;
  /**
   * Offset got from request
   */
  offset?: number;

  constructor(items: T[], count?: number, limit?: number, offset?: number) {
    this.items = items;
    this.count = count;
    this.limit = limit;
    this.offset = offset;
  }
}
