import type { RefObject } from "react";

export interface ISceneOwner {
  live: boolean;
}

// A focused scene takes over; an unfocused one only replaces an unmounted owner.
export function claimSceneOwner(
  ref: RefObject<ISceneOwner | null>,
  owner: ISceneOwner,
  active: boolean,
) {
  owner.live = true;
  if (active || !ref.current?.live) ref.current = owner;
  return () => {
    owner.live = false;
  };
}

// A released claim only resets the ref if no newer scene took it over.
export function claimSceneRef<T>(ref: RefObject<T>, value: T, idle: T) {
  ref.current = value;
  return () => {
    if (ref.current === value) ref.current = idle;
  };
}
