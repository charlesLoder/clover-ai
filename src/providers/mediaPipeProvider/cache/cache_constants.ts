// Shared constants for MediaPipe model caching
// Bump MODEL_CACHE_KEY_VERSION to invalidate existing logical entries without manually clearing DB.
export const MODEL_CACHE_DB_NAME = "clover-ai-mediapipe-provider-models";
export const MODEL_CACHE_KEY_VERSION = "v1"; // increment when manifest/chunk schema or logic changes
