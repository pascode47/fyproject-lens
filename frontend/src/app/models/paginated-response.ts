/**
 * Represents a paginated API response structure.
 * @template T The type of data items in the response.
 */
export interface PaginatedResponse<T> {
  data: T[];          // The array of items for the current page
  page: number;       // The current page number
  limit: number;      // The number of items per page
  total: number;      // The total number of items across all pages
  totalPages?: number; // Optional: Total number of pages (can be calculated)
}
