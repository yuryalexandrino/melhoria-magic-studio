import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCatalog } from "./catalog.functions";

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 30_000,
});

export const useCatalog = () => useSuspenseQuery(catalogQuery).data;
