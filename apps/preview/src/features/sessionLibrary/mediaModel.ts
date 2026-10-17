import type { Msg, Pattern } from "@buzzzz/core";
import type { ICachedPattern } from "./model";

export type IReceivedMedia = Extract<Msg, { type: "audio-haptics" | "animation-haptics" }>;

export interface ICachedMedia {
  readonly resourceId: string;
  readonly name: string;
  readonly kind: "audio" | "animation";
  readonly version: string;
  readonly clipId: string;
  readonly clipPath: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly durationMs: number;
  readonly pattern: Pattern;
  readonly volume?: number;
  readonly offset?: number;
  readonly soundStartMs?: number;
  readonly soundDurationMs?: number;
  readonly animation?: {
    readonly totalFrames: number;
    readonly frameRate: number;
    readonly width: number;
    readonly height: number;
  };
  readonly receivedAt: number;
}

export type ICachedResource = ICachedPattern | ICachedMedia;

export interface IResolvedResource {
  record: ICachedResource;
  localUri?: string;
  clipMissing: boolean;
}

export interface IMediaLibrary {
  readonly [connectionId: string]: readonly ICachedResource[];
}

export interface IMediaFiles {
  uri(clipPath: string): string;
  exists(clipPath: string): Promise<boolean>;
  download(
    url: string,
    clipPath: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<void>;
  remove(clipPath: string): Promise<void>;
  purge(connectionId: string): Promise<void>;
}
