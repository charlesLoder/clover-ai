/**
 * Helper class to manage model caching with Web Worker
 */

import { get_logger } from "../logger";
const logger = get_logger("ModelCache");

interface ProgressCallback {
  (loaded: number, total: number, percent: number, source?: "cache" | "network"): void;
}

export class ModelCache {
  #chunk_worker: Worker | null = null;
  #worker: Worker | null = null;

  #cleanup(): void {
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
    }
  }

  #cleanup_chunk() {
    if (this.#chunk_worker) {
      this.#chunk_worker.terminate();
      this.#chunk_worker = null;
    }
  }

  /**
   * Cancel ongoing download and cleanup
   */
  cancel(): void {
    this.#cleanup();
  }

  /**
   * Load model from cache or network in chunks using a Web Worker and return a ReadableStreamDefaultReader
   */
  async load_model(
    url: string,
    modelKey: string,
    onProgress?: ProgressCallback,
    chunkSize: number = 8 * 1024 * 1024,
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    // Create a readable stream that we'll feed with worker chunk messages
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
      cancel: () => {
        this.#cleanup_chunk();
      },
    });

    return new Promise((resolve, reject) => {
      this.#chunk_worker = new Worker(new URL("./model_cache_worker.ts", import.meta.url), {
        type: "module",
      });

      let source: "cache" | "network" = "network";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.#chunk_worker.onmessage = (event: MessageEvent<any>) => {
        const msg = event.data;
        if (msg && msg.type) {
          switch (msg.type) {
            case "cache":
              logger.debug("cache-hit manifest received", msg);
              source = "cache";
              break;
            case "progress":
              if (msg.percent % 10 === 0) logger.debug("progress", msg.percent, "%");
              break;
            case "chunk":
              if (msg.index % 100 === 0 || msg.final)
                logger.debug("chunk", msg.index, "final=", msg.final);
              break;
            case "complete":
              logger.info(
                "complete",
                msg.parts,
                "parts totalMB=",
                (msg.totalSize / 1024 / 1024).toFixed(1),
              );
              break;
            case "error":
              logger.error("error message", msg.error);
              break;
          }
        }

        switch (msg.type) {
          case "progress":
            onProgress?.(msg.loaded, msg.total, msg.percent, source);
            break;
          case "cache":
            onProgress?.(0, msg.totalSize, 0, source);
            break;
          case "chunk":
            if (msg.arrayBuffer && msg.arrayBuffer.byteLength > 0) {
              controller.enqueue(new Uint8Array(msg.arrayBuffer));
            }
            if (msg.final) {
              break;
            }
            break;
          case "complete":
            controller.close();
            resolve(stream.getReader());
            this.#cleanup_chunk();
            break;
          case "error":
            controller.error(new Error(msg.error));
            this.#cleanup_chunk();
            reject(new Error(msg.error));
            break;
        }
      };

      this.#chunk_worker.onerror = (e) => {
        controller.error(e);
        this.#cleanup_chunk();
        reject(new Error(`Chunk worker error: ${e.message}`));
      };

      this.#chunk_worker.postMessage({ type: "download", url, modelKey, chunkSize });
    });
  }
}
