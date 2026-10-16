import type { ReactNode } from "react";
import { FilterContext, useFilterState } from "./useFilters";

interface IFilterProvider {
  children: ReactNode;
}
export function FilterProvider(props: IFilterProvider) {
  const { children } = props;
  return <FilterContext value={useFilterState()}>{children}</FilterContext>;
}
