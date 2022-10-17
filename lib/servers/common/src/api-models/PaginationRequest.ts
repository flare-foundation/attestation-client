export interface PaginationRequest {
  limit?: number;
  offset?: number;
  sort?: "ASC" | "DESC";
  sortBy?: string;
  query?: string;
}
