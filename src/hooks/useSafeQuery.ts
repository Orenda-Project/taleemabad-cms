import { useQuery, UseQueryOptions } from "@tanstack/react-query"

/**
 * Safe query wrapper that guarantees data is always an array.
 * Prevents .map(), .filter(), .reduce(), etc. from crashing on non-array responses.
 */
export function useSafeQuery<T extends any[]>(
  options: Omit<UseQueryOptions<T, Error, T>, "queryKey"> & { queryKey: any[] }
) {
  return useQuery({
    ...options,
    // Ensure data is always an array even on error or unexpected response
    select: (data: any) => {
      return (Array.isArray(data) ? data : []) as T
    },
  } as UseQueryOptions<T>)
}
