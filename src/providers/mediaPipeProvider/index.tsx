import { Button, Heading } from "@components";
import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";
import type { AssistantMessage, Message } from "@types";
import { BaseProvider } from "../../plugin/base_provider";
import { MODEL_CACHE_DB_NAME, MODEL_CACHE_KEY_VERSION } from "./cache/cache_constants";
import { ModelCache } from "./cache/model_cache";
import { get_logger, set_log_level, type LogLevel } from "./logger";
import styles from "./style.module.css";

type MediaPipeOptions = {
  max_num_images?: number;
  max_tokens?: number;
  model_asset_path?: string;
  random_seed?: number;
  temperature?: number;
  top_k?: number;
  wasm_base_path?: string;
};

type MediaPipeProviderOptions = {
  log_level?: LogLevel;
  media_pipe_options?: MediaPipeOptions;
};

/**
 * A provider that runs a local (on-device) LLM using MediaPipe @mediapipe/tasks-genai.
 */
export class MediaPipeProvider extends BaseProvider {
  #cached_model_reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  #llm: LlmInference | null = null;
  #logger = get_logger("MediaPipeProvider");
  #media_pipe_options: Required<MediaPipeOptions>;
  #model_cache: ModelCache;
  #progress_message: string = "";
  #setup_state: "consenting" | "loading" | "error" = "consenting";

  constructor(options: MediaPipeProviderOptions = { log_level: "info", media_pipe_options: {} }) {
    super();
    if (options.log_level) {
      set_log_level(options.log_level);
    }
    this.#model_cache = new ModelCache();
    this.#media_pipe_options = {
      max_num_images: options.media_pipe_options?.max_num_images ?? 5,
      max_tokens: options.media_pipe_options?.max_tokens ?? 1000,
      model_asset_path:
        options.media_pipe_options?.model_asset_path ??
        "https://huggingface.co/charlesLoder/gemma-3n-E4B-it-litert-lm/resolve/main/gemma-3n-E4B-it-int4-Web.litertlm",
      random_seed: options.media_pipe_options?.random_seed ?? 101,
      temperature: options.media_pipe_options?.temperature ?? 0.8,
      top_k: options.media_pipe_options?.top_k ?? 40,
      wasm_base_path:
        options.media_pipe_options?.wasm_base_path ??
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm",
    };
  }

  /**
   * Build prompt sequence following MediaPipe's multimodal format
   */
  #build_prompt(
    messages: Message[],
    conversationHistory: Message[],
  ): Array<string | { imageSource: string }> {
    const sequence: Array<string | { imageSource: string }> = [];

    // Add system prompt if present
    const systemPrompt = this.plugin_state.systemPrompt;
    if (systemPrompt) {
      sequence.push(systemPrompt + "\n");
    }

    const allMessages = [...conversationHistory, ...messages];

    for (const message of allMessages) {
      if (message.role === "system") continue;

      if (message.role === "user") {
        sequence.push("<start_of_turn>user\n");

        for (const content of message.content) {
          if (content.type === "text") {
            sequence.push(content.content);
          } else if (content.type === "media" && content.content.src) {
            sequence.push({ imageSource: content.content.src });
          }
        }

        sequence.push("<end_of_turn>\n");
      } else if (message.role === "assistant") {
        if (message.type === "response") {
          sequence.push(`<start_of_turn>model\n${message.content.content}<end_of_turn>\n`);
        }
      }
    }

    // Start model turn for response
    sequence.push("<start_of_turn>model\n");
    return sequence;
  }

  /**
   * Clear cached model data (IndexedDB database) then invoke a callback.
   */
  #clear_cache(on_cleared: () => void) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 500;
    let attempt = 0;
    const tryDelete = () => {
      attempt++;
      try {
        this.#logger.info(
          `clearing model cache (IndexedDB ${MODEL_CACHE_DB_NAME}) attempt=${attempt}`,
        );
        const req = indexedDB.deleteDatabase(MODEL_CACHE_DB_NAME);
        req.onsuccess = () => {
          this.#logger.info("cache cleared");
          on_cleared();
        };
        req.onerror = () => {
          this.#logger.warn("cache clear error", req.error);
          on_cleared(); // proceed anyway
        };
        req.onblocked = () => {
          this.#logger.warn("cache clear blocked (open connections)");
          if (attempt < MAX_RETRIES) {
            setTimeout(tryDelete, RETRY_DELAY_MS);
          } else {
            this.#logger.warn("cache clear giving up after retries");
            on_cleared();
          }
        };
      } catch (e) {
        this.#logger.warn("cache clear threw", e);
        on_cleared();
      }
    };
    tryDelete();
  }

  async #load_model() {
    try {
      this.#logger.debug("#load_model start");
      this.#progress_message = "Initializing WASM runtime...";
      this.update_plugin_provider();
      const genai = await FilesetResolver.forGenAiTasks(this.#media_pipe_options.wasm_base_path);

      if (!this.#cached_model_reader) {
        this.#logger.info("starting streaming download");
        this.#progress_message = "Preparing chunked download...";
        this.update_plugin_provider();

        const model_key = `gemma-3n-E4B-it-${MODEL_CACHE_KEY_VERSION}-${this.#media_pipe_options.model_asset_path.split("/").pop()}`;
        // Throttled progress state (closure locals)
        let last_percent = -1;
        let last_time = 0;
        let last_loaded_mb_shown = -1;
        const PERCENT_STEP_NETWORK = 2; // only update UI every 2%
        const PERCENT_STEP_CACHE = 10; // cache loads are fast; every 10%
        const MIN_INTERVAL_MS = 900; // or at least every 0.9s
        const MIN_MB_STEP = 64; // if total unknown, every 64MB

        this.#cached_model_reader = await this.#model_cache.load_model(
          this.#media_pipe_options.model_asset_path,
          model_key,
          (loaded, total, percent, source) => {
            const now = performance.now();
            const from_cache = source === "cache";
            const loaded_mb = loaded / 1024 / 1024;
            const percent_step = from_cache ? PERCENT_STEP_CACHE : PERCENT_STEP_NETWORK;

            function calc_update(): boolean {
              // always show completion
              if (percent === 100) {
                return true;
              }

              // first update
              if (last_percent < 0) {
                return true;
              }

              if (percent - last_percent >= percent_step) {
                return true;
              }

              // Unknown total size: use MB step
              if (
                !total &&
                (last_loaded_mb_shown < 0 || loaded_mb - last_loaded_mb_shown >= MIN_MB_STEP)
              ) {
                return true;
              }

              return false;
            }

            let should_update = calc_update();

            // Time-based backstop
            if (!should_update && now - last_time >= MIN_INTERVAL_MS) {
              should_update = true;
            }

            // skip noisy update
            if (!should_update) {
              return;
            }

            last_percent = percent;
            last_time = now;
            last_loaded_mb_shown = loaded_mb;

            const loaded_mb_disp = Math.round(loaded_mb);
            const total_mb_disp = total ? Math.round(total / 1024 / 1024) : undefined;
            const label = from_cache ? "Load from cache" : "Downloading (stream)";

            this.#progress_message =
              total_mb_disp !== undefined && total_mb_disp > 0
                ? `${label}: ${loaded_mb_disp}MB / ${total_mb_disp}MB (${percent}%)`
                : `${label}: ${loaded_mb_disp}MB received`;

            this.#logger.debug("progress(throttled)", {
              percent,
              loaded_mb_disp,
              total_mb_disp,
              source,
            });

            // Update UI
            this.update_plugin_provider();
          },
        );

        this.#logger.info("streaming reader ready");
      }

      this.#progress_message = "Initializing model (this may take a moment)...";
      this.update_plugin_provider();

      if (!this.#cached_model_reader) {
        throw new Error("Model reader missing after download step");
      }

      this.#logger.info("creating LlmInference", { streaming: !!this.#cached_model_reader });
      this.#llm = await LlmInference.createFromOptions(genai, {
        baseOptions: {
          modelAssetBuffer: this.#cached_model_reader,
        },
        maxTokens: this.#media_pipe_options.max_tokens,
        topK: this.#media_pipe_options.top_k,
        temperature: this.#media_pipe_options.temperature,
        randomSeed: this.#media_pipe_options.random_seed,
        maxNumImages: this.#media_pipe_options.max_num_images,
      });
      this.#logger.info("model createFromOptions complete");

      this.#progress_message = "Model loaded successfully!";
      this.update_plugin_provider();
    } catch (err) {
      this.#logger.error("MediaPipe model load failed", err);
      this.#progress_message =
        err instanceof Error ? `${err.message}` : "An unknown error occurred.";
      this.#setup_state = "error";
      this.update_plugin_provider();
    }
  }

  get status() {
    return this.#llm ? "ready" : "initializing";
  }

  async generate_response(messages: Message[], conversationHistory: Message[]): Promise<void> {
    try {
      if (!this.#llm) {
        throw new Error("Model not loaded");
      }

      const promptSequence = this.#build_prompt(messages, conversationHistory);
      this.set_conversation_state("assistant_responding");

      const assistantMessage: AssistantMessage = {
        role: "assistant",
        type: "response",
        content: { type: "text", content: "" },
      };
      this.add_messages([assistantMessage as Message]);
      await this.#llm.generateResponse(promptSequence, (partial: string, done: boolean) => {
        assistantMessage.content.content += partial;
        this.update_last_message(assistantMessage);
        if (done) {
          this.set_conversation_state("idle");
        }
      });
    } catch (err) {
      this.#logger.error("Inference failed", err);
      this.set_conversation_state("error");
    }
  }

  SetupComponent() {
    const handleConsent = () => {
      this.#setup_state = "loading";
      this.update_plugin_provider();
      this.#load_model();
    };

    const handleForceReload = () => {
      // Reset any existing in-memory state
      this.#cached_model_reader?.cancel?.().catch(() => {});
      this.#cached_model_reader = null;
      this.#progress_message = "Clearing cached model...";
      this.update_plugin_provider();
      this.#clear_cache(() => {
        this.#setup_state = "loading";
        this.#progress_message = "Preparing chunked download...";
        this.update_plugin_provider();
        this.#load_model();
      });
    };

    const handleRetry = () => {
      this.#setup_state = "consenting";
      this.#progress_message = "";
      this.update_plugin_provider();
    };

    // Consenting screen
    if (this.#setup_state === "consenting") {
      return (
        <div>
          <Heading level="h3">MediaPipe Local LLM</Heading>
          <p>
            This will download and run a Gemma 3N model locally in your browser. The model will be
            cached for future use.
          </p>
          <div className={styles.requirementsBox}>
            <Heading level="h4">Requirements:</Heading>
            <ul>
              <li>WebGPU-compatible browser</li>
              <li>~1.7GB download (model will be cached locally)</li>
              <li>Sufficient device memory for on-device inference</li>
            </ul>
          </div>
          <p className={styles.termsText}>
            By proceeding, you agree to the{" "}
            <a
              className={styles.termsLink}
              href="https://ai.google.dev/gemma/terms"
              rel="noopener noreferrer"
              target="_blank"
            >
              Gemma Terms of Use
            </a>
            .
          </p>
          <Button onClick={handleConsent}>Accept and Continue</Button>
          <Button style={{ marginLeft: "0.75rem" }} variant="danger" onClick={handleForceReload}>
            Force Reload (Clear Cache)
          </Button>
        </div>
      );
    }

    if (this.#setup_state === "error") {
      return (
        <div>
          <Heading level="h3">Error Loading Model</Heading>
          <p>The following error occurred while loading the model:</p>
          <p className={styles.errorBox}>{this.#progress_message}</p>
          <p className={styles.errorNote}>
            Check the browser console for detailed error information.
          </p>
          <Button onClick={handleRetry}>Back</Button>
        </div>
      );
    }

    return (
      <div>
        <Heading level="h3">Loading Model</Heading>
        <p>{this.#progress_message || "Starting download..."}</p>
      </div>
    );
  }
}
