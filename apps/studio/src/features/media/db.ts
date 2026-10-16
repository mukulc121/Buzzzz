import { MediaStorageError } from "./model";

const NAME = "buzzzz-media";
const VERSION = 1;
let connection: Promise<IDBDatabase> | null = null;

function upgrade(db: IDBDatabase) {
  const items = db.createObjectStore("items", { keyPath: "id" });
  items.createIndex("projectId", "projectId");
  db.createObjectStore("blobs", { keyPath: "id" });
  const attachments = db.createObjectStore("attachments", {
    keyPath: ["projectId", "scope", "kind"],
  });
  attachments.createIndex("assetId", "assetId");
  attachments.createIndex("projectScope", ["projectId", "scope"]);
}

function openMediaDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(
      new MediaStorageError("unavailable", "This browser can't store media offline."),
    );
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(
        new MediaStorageError("unavailable", "Close other Buzzzz tabs to upgrade media storage."),
      );
  }).catch((error: unknown) => {
    connection = null;
    throw error;
  });
  return connection;
}

export function settle(request: IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted", "AbortError"));
  });
}

// Runs body inside one transaction and resolves only after it commits.
export async function transact<T>(
  stores: string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openMediaDb();
  const tx = db.transaction(stores, mode);
  const done = committed(tx);
  try {
    const result = await body(tx);
    await done;
    return result;
  } catch (error) {
    if (!tx.error) {
      try {
        tx.abort();
      } catch {
        /* already finished */
      }
    }
    done.catch(() => undefined);
    throw error;
  }
}
