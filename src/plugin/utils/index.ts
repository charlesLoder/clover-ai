import { InternationalString } from "@iiif/presentation-3";
import type { Message } from "@types";

export function getLabelByUserLanguage(label: InternationalString | undefined): string[] {
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

type Scheme = "http" | "https" | (string & {});
/** @example "example.org" */
type Server = string;
/**
 * @remarks
 * If not empty, must start with a leading slash and not end with a trailing slash.
 *
 * @example "/iiif" */
type Prefix = `/${string}` | "";
/** @example "image1" */
type Identifier = string;
/** @example "full", "x,y,w,h" */
type Region = string;
/** @example "max", "w,", ",h", "pct:n" */
type Size = string;
/** @example "0", "90", "!90" */
type Rotation = string;
/** @example "default", "color", "gray", "bitonal" */
type Quality = string;
/** @example "jpg", "png", "tif" */
type Format = string;

/**
 * A IIIF Image Request URI as defined in the IIIF Image API 3.0 specification.
 *
 * @example
 * "https://example.org/iiif/image1/full/max/0/default.jpg"
 */
export type IIIFImageRequestURI =
  `${Scheme}://${Server}${Prefix}/${Identifier}/${Region}/${Size}/${Rotation}/${Quality}.${Format}`;

export interface IIIFImageRequestParams {
  scheme: Scheme;
  server: Server;
  prefix: Prefix;
  identifier: Identifier;
  region: Region;
  size: Size;
  rotation: Rotation;
  quality: Quality;
  format: Format;
}

/**
 * Create a IIIF Image Request URI from its components.
 *
 */
export function createIIIFImageRequestURI({
  scheme = "https",
  server,
  prefix = "",
  identifier,
  region = "full",
  size = "max",
  rotation = "0",
  quality = "default",
  format = "jpg",
}: Partial<IIIFImageRequestParams>): IIIFImageRequestURI {
  return `${scheme}://${server}${prefix}/${identifier}/${region}/${size}/${rotation}/${quality}.${format}`;
}

/**
 * Update parts of a IIIF Image Request URI while preserving the other components.
 *
 * @param baseURI a IIIF Image Request URI containing at least the server and identifier
 * @param updates the parts of the URI to update
 */
export function updateIIIFImageRequestURI(
  baseURI: string,
  updates: Partial<IIIFImageRequestParams>,
): IIIFImageRequestURI {
  const url = new URL(baseURI);
  const originalParts = url.pathname.split("/").filter((part) => part);

  // work backwards to pop off the known parts
  const qualityAndFormat = originalParts.pop()?.split(".") ?? [];
  const quality = qualityAndFormat[0];
  const format = qualityAndFormat[1];
  const rotation = originalParts.pop();
  const size = originalParts.pop();
  const region = originalParts.pop();
  const identifier = originalParts.pop();
  const prefix = originalParts.join("/");

  if (!identifier) {
    throw new Error("Invalid IIIF Image Request URI: Missing identifier");
  }

  if (!url.host) {
    throw new Error("Invalid IIIF Image Request URI: Missing server");
  }

  return createIIIFImageRequestURI({
    scheme: url?.protocol?.replace(":", "") ?? "https",
    server: url.host,
    prefix: updates.prefix ?? (prefix ? `/${prefix}` : ""),
    identifier: updates.identifier ?? identifier,
    region: updates.region ?? region,
    size: updates.size ?? size,
    rotation: updates.rotation ?? rotation,
    quality: updates.quality ?? quality,
    format: updates.format ?? format,
  });
}
