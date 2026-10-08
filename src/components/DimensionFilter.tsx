"use client";

import { createContext, useContext, useState } from "react";

type DimensionFilter = { dimension: string; setDimension: (code: string) => void };

const DimensionFilterContext = createContext<DimensionFilter | null>(null);

// Shares the human-security filter between the dimension panel and the recommendation list of a page.
export function DimensionFilterProvider({ children }: { children: React.ReactNode }) {
  const [dimension, setDimension] = useState("all");
  return <DimensionFilterContext.Provider value={{ dimension, setDimension }}>{children}</DimensionFilterContext.Provider>;
}

// Without a provider the filter is local to the component that uses it.
export function useDimensionFilter(): DimensionFilter {
  const shared = useContext(DimensionFilterContext);
  const [dimension, setDimension] = useState("all");
  return shared ?? { dimension, setDimension };
}
