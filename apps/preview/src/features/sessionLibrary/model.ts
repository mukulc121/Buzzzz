import type { Pattern } from "@buzzzz/core";

export interface ICachedPattern {
  readonly resourceId: string;
  readonly name: string;
  readonly kind: "pattern";
  readonly version: string;
  readonly durationMs: number;
  readonly pattern: Pattern;
  readonly receivedAt: number;
}

export interface IPatternLibrary {
  readonly [connectionId: string]: readonly ICachedPattern[];
}
