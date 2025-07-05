import type { ManifestNormalized } from "@iiif/presentation-3-normalized";
import type { Message } from "@types";

export function getLabelByUserLanguage(label: ManifestNormalized["label"]): string[] {
  if (!label) {
    return [];
  }
  const userLangs = navigator.languages || [navigator.language];
  const lang = userLangs.find((l) => label[l]) || "none";
  const titles = label[lang] ? label[lang] : [];
  return titles;
}

const STORAGE_KEY = "clover-ai-conversation";

export function loadMessagesFromStorage(): Message[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    // Validate the structure - ensure it's an array of messages
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Basic validation of message structure
    for (const message of parsed) {
      if (!message.role || !message.content) {
        return [];
      }
    }

    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to load messages from session storage:", error);
    return [];
  }
}

export function setMessagesToStorage(messages: Message[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to save messages to session storage:", error);
  }
}
