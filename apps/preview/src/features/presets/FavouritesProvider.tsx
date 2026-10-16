import type { ReactNode } from "react";
import { FavouritesContext, useFavouriteState } from "./useFavourites";

interface IFavouritesProvider {
  children: ReactNode;
}
export function FavouritesProvider(props: IFavouritesProvider) {
  const { children } = props;
  return <FavouritesContext value={useFavouriteState()}>{children}</FavouritesContext>;
}
