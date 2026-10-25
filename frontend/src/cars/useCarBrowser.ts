import { useCallback, useMemo, useState } from 'react';
import type { ApiClient } from '../api/client';
import { EMPTY_FILTERS, filtersToParams, type CarFilters } from './filters';
import { useCarSearch } from './useCarSearch';

/** Search filters plus paging for a car list: the state the shop and the admin list both need. */
export function useCarBrowser(api: ApiClient) {
  const [filters, setFilters] = useState<CarFilters>(EMPTY_FILTERS);
  const [pageNumber, setPageNumber] = useState(0);
  const params = useMemo(() => filtersToParams(filters, pageNumber), [filters, pageNumber]);
  const search = useCarSearch(api, params);
  const { reload } = search;

  /**
   * Applies new filters and returns to the first page. Pressing Search again with the same filters still
   * loads fresh results (stock may have changed); React batches this with the state changes into one request.
   */
  const applyFilters = useCallback(
    (next: CarFilters) => {
      setFilters(next);
      setPageNumber(0);
      reload();
    },
    [reload],
  );
  const previousPage = useCallback(() => setPageNumber((n) => Math.max(0, n - 1)), []);
  const nextPage = useCallback(() => setPageNumber((n) => n + 1), []);

  return { ...search, pageNumber, applyFilters, previousPage, nextPage };
}
