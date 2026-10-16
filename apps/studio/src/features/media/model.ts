export type MediaKind = "audio" | "animation" | "rive";
export type MediaErrorCode = "quota" | "limit" | "invalid" | "missing" | "unavailable";

export interface IMediaItem {
  id: string;
  projectId: string;
  kind: MediaKind;
  name: string;
  originalName: string;
  type: string;
  size: number;
  lastModified: number;
  addedAt: number;
  sha256: string;
}
export interface IMediaTrim {
  startMs: number;
  endMs: number;
}
export interface IMediaAttachment {
  projectId: string;
  scope: string;
  kind: MediaKind;
  assetId: string;
  trim: IMediaTrim | null;
}

const MiB = 1024 * 1024;
export const MEDIA_LIMITS = {
  fileBytes: 20 * MiB,
  projectBytes: 100 * MiB,
  projectFiles: 10,
  trimMs: 60_000,
  nameLength: 120,
};

export class MediaStorageError extends Error {
  readonly code: MediaErrorCode;
  constructor(code: MediaErrorCode, message: string) {
    super(message);
    this.name = "MediaStorageError";
    this.code = code;
  }
}
