/**
 * Chunked model downloader & cacher worker.
 * Streams large model without ever materializing full ArrayBuffer.
 * Messages:
 *  from main:
 *    { type: 'download', url, modelKey, chunkSize }
 *  to main:
 *    { type: 'progress', loaded, total, percent }
 *    { type: 'chunk', index, arrayBuffer, final }
 *    { type: 'complete', parts, totalSize, chunkSize }
 *    { type: 'error', error }
 */

import { scoped } from "../logger";
import { MODEL_CACHE_DB_NAME } from "./cache_constants";
const logger = scoped("ChunkWorker");

interface DownloadMsg {
  type: "download";
  url: string;
  modelKey: string;
  chunkSize: number;
}
interface ProgressMsg {
  type: "progress";
  loaded: number;
  total: number;
  percent: number;
}
interface ChunkMsg {
  type: "chunk";
  index: number;
  arrayBuffer: ArrayBuffer;
  final: boolean;
}
interface CompleteMsg {
  type: "complete";
  parts: number;
  totalSize: number;
  chunkSize: number;
}
interface CacheMsg {
  type: "cache";
  parts: number;
  totalSize: number;
  chunkSize: number;
}
interface ErrorMsg {
  type: "error";
  error: string;
}

// Use distinct constants to avoid name collisions if bundled together (shared)
const DB_NAME = MODEL_CACHE_DB_NAME;
const DB_VERSION = 1; // bump for chunk store
const CHUNK_STORE = "model_chunks";
const MANIFEST_STORE = "model_manifests";

interface ManifestRecord {
  key: string; // modelKey
  totalSize: number;
  parts: number;
  chunkSize: number;
  timestamp: number;
  complete: boolean;
}

class ChunkDB {
  db: IDBDatabase | null = null;

  async delete_chunks(modelKey: string): Promise<void> {
    if (!this.db) throw new Error("db not init");
    return new Promise((res, rej) => {
      const tx = this.db!.transaction(CHUNK_STORE, "readwrite");
      const store = tx.objectStore(CHUNK_STORE);
      const prefix = `${modelKey}:part:`;
      const req = store.openCursor();
      req.onerror = () => rej(req.error);
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          res();
          return;
        }
        if (typeof cursor.key === "string" && cursor.key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      };
    });
  }

  async delete_manifest(key: string): Promise<void> {
    if (!this.db) throw new Error("db not init");
    return new Promise((res, rej) => {
      const tx = this.db!.transaction(MANIFEST_STORE, "readwrite");
      const store = tx.objectStore(MANIFEST_STORE);
      const r = store.delete(key);
      r.onerror = () => rej(r.error);
      r.onsuccess = () => res();
    });
  }

  async get_chunk(modelKey: string, index: number): Promise<ArrayBuffer | null> {
    if (!this.db) throw new Error("db not init");
    return new Promise((res, rej) => {
      const tx = this.db!.transaction(CHUNK_STORE, "readonly");
      const store = tx.objectStore(CHUNK_STORE);
      const key = `${modelKey}:part:${index}`;
      const r = store.get(key);
      r.onerror = () => rej(r.error);
      r.onsuccess = () => res(r.result ? r.result.data : null);
    });
  }

  async get_manifest(modelKey: string): Promise<ManifestRecord | null> {
    if (!this.db) throw new Error("db not init");
    return new Promise((res, rej) => {
      const tx = this.db!.transaction(MANIFEST_STORE, "readonly");
      const store = tx.objectStore(MANIFEST_STORE);
      const r = store.get(modelKey);
      r.onerror = () => rej(r.error);
      r.onsuccess = () => res(r.result || null);
    });
  }

  async has_chunk(modelKey: string, index: number): Promise<boolean> {
    if (!this.db) throw new Error("db not init");
    return new Promise((res, rej) => {
      const tx = this.db!.transaction(CHUNK_STORE, "readonly");
      const store = tx.objectStore(CHUNK_STORE);
      const key = `${modelKey}:part:${index}`;
      const r = store.count(key);
      r.onerror = () => rej(r.error);
      r.onsuccess = () => res(r.result > 0);
    });
  }

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CHUNK_STORE)) {
          db.createObjectStore(CHUNK_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(MANIFEST_STORE)) {
          db.createObjectStore(MANIFEST_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
    });
  }

  async put_chunk(modelKey: string, index: number, ab: ArrayBuffer): Promise<void> {
    if (!this.db) throw new Error("db not init");
    return new Promise((res, rej) => {
      const tx = this.db!.transaction(CHUNK_STORE, "readwrite");
      const store = tx.objectStore(CHUNK_STORE);
      const r = store.put({
        key: `${modelKey}:part:${index}`,
        data: ab,
        size: ab.byteLength,
        idx: index,
      });
      r.onerror = () => rej(r.error);
      r.onsuccess = () => res();
    });
  }

  async put_manifest(m: ManifestRecord): Promise<void> {
    if (!this.db) throw new Error("db not init");
    return new Promise((res, rej) => {
      const tx = this.db!.transaction(MANIFEST_STORE, "readwrite");
      const store = tx.objectStore(MANIFEST_STORE);
      const r = store.put(m);
      r.onerror = () => rej(r.error);
      r.onsuccess = () => res();
    });
  }
}

const db = new ChunkDB();

async function stream_download(msg: DownloadMsg) {
  const { url, modelKey, chunkSize } = msg;
  logger.info(`init modelKey=${modelKey} chunkSizeMB=${(chunkSize / 1024 / 1024).toFixed(2)}`);
  await db.init();

  const manifest = await db.get_manifest(modelKey);
  if (manifest) {
    logger.info(
      `cache manifest parts=${manifest.parts} totalMB=${(manifest.totalSize / 1024 / 1024).toFixed(1)} complete=${manifest.complete}`,
    );
    if (!manifest.complete) {
      logger.warn("manifest incomplete -> purge");
      await db.delete_manifest(modelKey);
      await db.delete_chunks(modelKey);
    } else {
      let loaded = 0;
      self.postMessage({
        type: "cache",
        parts: manifest.parts,
        totalSize: manifest.totalSize,
        chunkSize: manifest.chunkSize,
      } as CacheMsg);
      let allGood = true;
      for (let i = 0; i < manifest.parts; i++) {
        const ab = await db.get_chunk(modelKey, i);
        if (!ab) {
          logger.warn(`missing cached chunk ${i}; will redownload`);
          allGood = false;
          break;
        }
        loaded += ab.byteLength;
        if (i % 50 === 0 || i === manifest.parts - 1) {
          logger.debug(
            `cached chunk ${i + 1}/${manifest.parts} loadedMB=${(loaded / 1024 / 1024).toFixed(1)}`,
          );
        }
        const percent = manifest.totalSize ? Math.round((loaded / manifest.totalSize) * 100) : 0;
        self.postMessage({
          type: "progress",
          loaded,
          total: manifest.totalSize,
          percent,
        } as ProgressMsg);
        self.postMessage(
          { type: "chunk", index: i, arrayBuffer: ab, final: i === manifest.parts - 1 } as ChunkMsg,
          { transfer: [ab] },
        );
      }
      if (allGood && loaded === manifest.totalSize) {
        logger.info(`cache stream complete`);
        self.postMessage({
          type: "complete",
          parts: manifest.parts,
          totalSize: manifest.totalSize,
          chunkSize: manifest.chunkSize,
        } as CompleteMsg);
        return;
      }
      logger.warn("cache corrupted -> purge");
      await db.delete_manifest(modelKey);
      await db.delete_chunks(modelKey);
    }
  }

  // Network path
  const resp = await fetch(url);
  if (!resp.ok || !resp.body) {
    self.postMessage({ type: "error", error: `http ${resp.status}` } as ErrorMsg);
    return;
  }

  const totalHeader = resp.headers.get("content-length");
  const total = totalHeader ? parseInt(totalHeader, 10) : 0;
  logger.info(`network start sizeMB=${total ? (total / 1024 / 1024).toFixed(1) : "unknown"}`);
  const reader = resp.body.getReader();
  let loadedNet = 0;
  let partIndex = 0;
  let current = new Uint8Array(chunkSize);
  let offset = 0;
  let parts = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const src = value;
      let srcOff = 0;
      while (srcOff < src.length) {
        const toCopy = Math.min(chunkSize - offset, src.length - srcOff);
        current.set(src.subarray(srcOff, srcOff + toCopy), offset);
        offset += toCopy;
        srcOff += toCopy;
        if (offset === chunkSize) {
          const full = current.buffer.slice(0);
          await db.put_chunk(modelKey, partIndex, full);
          self.postMessage(
            { type: "chunk", index: partIndex, arrayBuffer: full, final: false } as ChunkMsg,
            { transfer: [full] },
          );
          if (partIndex % 50 === 0) {
            logger.debug(
              `stored chunk ${partIndex} loadedMB=${(loadedNet / 1024 / 1024).toFixed(1)}`,
            );
          }
          partIndex++;
          parts++;
          current = new Uint8Array(chunkSize);
          offset = 0;
        }
      }
      loadedNet += value.length;
      const percent = total ? Math.round((loadedNet / total) * 100) : 0;
      self.postMessage({
        type: "progress",
        loaded: loadedNet,
        total,
        percent,
      } as ProgressMsg);
      if (percent % 10 === 0)
        logger.debug(`progress ${percent}% loadedMB=${(loadedNet / 1024 / 1024).toFixed(1)}`);
    }
    if (offset > 0) {
      const finalBuf = current.slice(0, offset).buffer;
      await db.put_chunk(modelKey, partIndex, finalBuf);
      self.postMessage(
        { type: "chunk", index: partIndex, arrayBuffer: finalBuf, final: true } as ChunkMsg,
        { transfer: [finalBuf] },
      );
      parts++;
    } else if (parts > 0) {
      self.postMessage({
        type: "chunk",
        index: partIndex - 1,
        arrayBuffer: new ArrayBuffer(0),
        final: true,
      } as ChunkMsg);
    }
    // Integrity verification (robust): attempt to confirm contiguous chunks exist.
    try {
      let verifiedParts = 0;
      let verifiedTotal = 0;
      for (let i = 0; i < parts; i++) {
        const ab = await db.get_chunk(modelKey, i);
        if (!ab) {
          logger.warn(`integrity: missing chunk ${i} (expected parts=${parts}); truncating cache`);
          break;
        }
        verifiedParts++;
        verifiedTotal += ab.byteLength;
      }
      if (verifiedParts !== parts) {
        logger.warn(
          `integrity: adjusted parts from ${parts} -> ${verifiedParts} totalMB=${(verifiedTotal / 1024 / 1024).toFixed(1)}`,
        );
        parts = verifiedParts;
        loadedNet = verifiedTotal; // reflect actual stored size
      } else {
        logger.debug(
          `integrity: verified ${verifiedParts} parts totalMB=${(verifiedTotal / 1024 / 1024).toFixed(1)}`,
        );
      }
    } catch (verErr) {
      logger.warn("integrity verification failed; proceeding without adjustment", verErr);
    }
    try {
      await db.put_manifest({
        key: modelKey,
        totalSize: loadedNet,
        parts,
        chunkSize,
        timestamp: Date.now(),
        complete: true,
      });
    } catch (mErr) {
      logger.error("putManifest failed", mErr);
      // Continue; main thread will treat as network path next time.
    }
    logger.info(`network complete parts=${parts} totalMB=${(loadedNet / 1024 / 1024).toFixed(1)}`);
    self.postMessage({
      type: "complete",
      parts,
      totalSize: loadedNet,
      chunkSize,
    } as CompleteMsg);
  } catch (e) {
    logger.error("error", e);
    self.postMessage({
      type: "error",
      error: e instanceof Error ? e.message : "unknown",
    } as ErrorMsg);
  } finally {
    reader.releaseLock();
    logger.debug("reader released");
  }
}

self.onmessage = (ev: MessageEvent<DownloadMsg>) => {
  if (ev.data.type === "download") {
    stream_download(ev.data);
  } else {
    self.postMessage({ type: "error", error: "unknown message" } as ErrorMsg);
  }
};
