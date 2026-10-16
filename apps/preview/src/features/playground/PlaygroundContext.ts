import { createContext } from "react";
import type { createPlaygroundStore } from "./playgroundStore";

export const PlaygroundContext = createContext<ReturnType<typeof createPlaygroundStore> | null>(
  null,
);
