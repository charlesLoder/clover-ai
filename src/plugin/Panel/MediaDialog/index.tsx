import { Button, Dialog, Heading, ImageSelect } from "@components";
import { usePlugin } from "@context";
import { serializeConfigPresentation3, Traverse } from "@iiif/parser";
import type {
  Annotation as IIIFAnnotation,
  Canvas,
  ContentResource,
  EmbeddedResource,
  SpecificResource,
} from "@iiif/presentation-3";
import type { Annotation, Media } from "@types";
import { getLabelByUserLanguage, updateIIIFImageRequestURI } from "@utils";
import { FC, useEffect, useRef, useState } from "react";
import style from "./style.module.css";

function isEmbeddedResource(
  body: unknown,
): body is EmbeddedResource {
  return typeof body === "object" && body !== null && "type" in body && (body as EmbeddedResource).type === "TextualBody";
}

function isSpecificResource(body: unknown): body is SpecificResource {
  return typeof body === "object" && body !== null && "type" in body && (body as SpecificResource).type === "SpecificResource";
}

function getTextualBodyValue(body: unknown): string | undefined {
  if (!body) return undefined;

  if (Array.isArray(body)) {
    for (const item of body) {
      const value = getTextualBodyValue(item);
      if (value) return value;
    }
    return undefined;
  }

  if (typeof body === "string") {
    return body;
  }

  if (isEmbeddedResource(body)) {
    return body.value;
  }

  if (isSpecificResource(body) && body.source) {
    return getTextualBodyValue(body.source);
  }

  if (typeof body === "object" && "value" in body && typeof (body as { value: unknown }).value === "string") {
    return (body as { value: string }).value;
  }

  return undefined;
}

function getTextualBodyValueFromAnnotation(annotation: IIIFAnnotation): string | undefined {
  if ("bodyValue" in annotation && typeof annotation.bodyValue === "string") {
    return annotation.bodyValue;
  }

  return getTextualBodyValue(annotation.body);
}

function isMediaInSelectedMedia(media: Media, selectedMedia: Media[]): boolean {
  return selectedMedia.some((m) => m.id === media.id);
}

function isAnnotationInSelectedAnnotations(
  annotation: Annotation,
  selectedAnnotations: Annotation[],
): boolean {
  return selectedAnnotations.some((a) => a.id === annotation.id);
}

function handleSelectedMedia(
  selected: boolean,
  media: Media,
  selectedMedia: Media[],
  onUpdate: (media: Media[]) => void,
) {
  const resources: Media[] = selected
    ? [...selectedMedia, media]
    : selectedMedia.filter((m) => m.id !== media.id);

  onUpdate(resources);
}

// Though the resource may have `width` and `height` properties
// it's type does not include them.
// To ensure we can access them safely, without excessive type checking,
// cast the resource to `any` and then try to access them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDimensions(resource: any): { height: number; width: number } {
  return {
    height: resource?.height || 0,
    width: resource?.width || 0,
  };
}

/**
 * Format a caption string for a IIIF resource including its dimensions if available.
 *
 * @param topline the top line of the caption, e.g. "Thumbnail"
 * @param resource the IIIF resource to get dimensions from
 * @returns a formatted caption string
 *
 * @example
 * ```ts
 * formatCaption("Thumbnail", resource);
 * // "Thumbnail\n(100 x 200)"
 * ```
 */
function formatCaption(topline: string, resource: ContentResource) {
  const { width, height } = getDimensions(resource);
  const dimensions = width && height ? `\n(${width} x ${height})` : "";
  return topline + dimensions;
}

const CurrentView = () => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    handleSelectedMedia(selected, media, state.selectedMedia, (resources) =>
      dispatch({ type: "setSelectedMedia", selectedMedia: resources }),
    );
  }

  function getCurrentViewDataUrl(canvas: HTMLCanvasElement | HTMLElement) {
    if ("toDataURL" in canvas) {
      return canvas.toDataURL("image/png");
    }
    return undefined;
  }

  function getFragment(): Media | null {
    if (state.openSeaDragonViewer && state.activeCanvas) {
      const canvas = state.openSeaDragonViewer.drawer.canvas;
      const width = "width" in canvas ? canvas.width : 0;
      const height = "height" in canvas ? canvas.height : 0;
      return {
        type: "fragment",
        id: `current-view`,
        src: getCurrentViewDataUrl(canvas) || "",
        caption: `Current view\n(${width} x ${height})`,
      };
    }

    return null;
  }

  if (!state.openSeaDragonViewer) {
    return <></>;
  }

  const currentFragment = getFragment();
  if (!currentFragment) {
    return <></>;
  }

  const fragmentMedia: Media = {
    type: "fragment",
    id: currentFragment.id,
    src: currentFragment.src || "",
    caption: currentFragment.caption || "",
  };

  return (
    <>
      {currentFragment.src && (
        <ImageSelect
          figcaption={fragmentMedia.caption}
          imgObjectFit="contain"
          src={fragmentMedia.src}
          initialState={
            isMediaInSelectedMedia(fragmentMedia, state.selectedMedia) ? "selected" : "unselected"
          }
          onSelectionChange={(selected) => handleAddMedia(selected, fragmentMedia)}
        />
      )}
    </>
  );
};

const Paintings: FC<{ canvas: Canvas }> = ({ canvas }) => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    // when adding the media, update the size to be max
    media.src = updateIIIFImageRequestURI(media.src, {
      size: `max`,
    });
    handleSelectedMedia(selected, media, state.selectedMedia, (resources) =>
      dispatch({ type: "setSelectedMedia", selectedMedia: resources }),
    );
  }

  const paintings: ContentResource[] = [];
  const traverse = new Traverse({
    contentResource: [
      (resource) => {
        if (resource.type === "Image") {
          paintings.push(resource);
        }
      },
    ],
  });
  traverse.traverseCanvasItems(canvas);

  if (!paintings.length) {
    return <></>;
  }

  const media: Media[] = paintings.reduce((acc, painting, i) => {
    if (!painting.id) {
      return acc;
    }

    // @ts-expect-error - I don't want to go down the rabbit hole of type checking here
    const label = getLabelByUserLanguage(painting?.label);
    acc.push({
      type: "image",
      id: `painting-${i}`,
      // use a smaller size so as to not load large images
      // update the size when the media is added
      src: updateIIIFImageRequestURI(painting.id, {
        size: "!300,300",
      }),
      caption: formatCaption(label[0] ? label[0] : "Painting", painting),
    });

    return acc;
  }, [] as Media[]);

  return (
    <>
      {media.map((m) => (
        <ImageSelect
          figcaption={m.caption}
          imgObjectFit="cover"
          initialState={isMediaInSelectedMedia(m, state.selectedMedia) ? "selected" : "unselected"}
          key={`painting-${m.id}`}
          src={m.src}
          onSelectionChange={(selected) => handleAddMedia(selected, m)}
        />
      ))}
    </>
  );
};

const Placeholder: FC<{ placeholder: NonNullable<Canvas["placeholderCanvas"]> }> = ({
  placeholder,
}) => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    handleSelectedMedia(selected, media, state.selectedMedia, (resources) =>
      dispatch({ type: "setSelectedMedia", selectedMedia: resources }),
    );
  }

  const paintings: ContentResource[] = [];
  const traverse = new Traverse({
    contentResource: [
      (resource) => {
        if (resource.type === "Image") {
          paintings.push(resource);
        }
      },
    ],
  });
  traverse.traverseCanvasItems(placeholder);

  if (!paintings.length) {
    return <></>;
  }

  const media: Media[] = paintings.reduce((acc, painting, i) => {
    if (!painting.id) {
      return acc;
    }

    acc.push({
      type: "image",
      id: `placeholder-${i}`,
      src: painting.id,
      caption: formatCaption("Placeholder", painting),
    });

    return acc;
  }, [] as Media[]);

  return (
    <>
      {media.map((m) => (
        <ImageSelect
          figcaption={m.caption}
          imgObjectFit="cover"
          initialState={isMediaInSelectedMedia(m, state.selectedMedia) ? "selected" : "unselected"}
          key={`placeholder-${m.id}`}
          src={m.src}
          onSelectionChange={(selected) => handleAddMedia(selected, m)}
        />
      ))}
    </>
  );
};

const Thumbnails: FC<{ thumbnails: ContentResource[] }> = ({ thumbnails }) => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    handleSelectedMedia(selected, media, state.selectedMedia, (resources) =>
      dispatch({ type: "setSelectedMedia", selectedMedia: resources }),
    );
  }

  const media: Media[] = thumbnails.reduce<Media[]>((acc, thumbnail, i) => {
    if (!thumbnail.id) {
      return acc;
    }
    acc.push({
      type: "image",
      id: `thumbnail-${i}`,
      src: thumbnail.id,
      caption: formatCaption("Thumbnail", thumbnail),
    });
    return acc;
  }, []);

  return (
    <>
      {media.map((thumbnail, index) => (
        <ImageSelect
          figcaption={thumbnail.caption}
          key={`thumbnail-${index}`}
          src={thumbnail.src}
          initialState={
            isMediaInSelectedMedia(thumbnail, state.selectedMedia) ? "selected" : "unselected"
          }
          onSelectionChange={(selected) => handleAddMedia(selected, thumbnail)}
        />
      ))}
    </>
  );
};

const Annotations: FC<{ canvas: Canvas }> = ({ canvas }) => {
  const { state, dispatch } = usePlugin();

  const annotations: Annotation[] = [];
  const traverse = new Traverse({
    annotation: [
      (a) => {
        const bodyValue = getTextualBodyValueFromAnnotation(a);
        if (bodyValue) {
          let region = undefined;
          if (a.target && typeof a.target === "object" && "source" in a.target) {
            const targetSource = a.target.source as string;
            const xywhMatch = targetSource.match(/#xywh=(\d+),(\d+),(\d+),(\d+)$/);
            if (xywhMatch) {
              region = {
                height: parseInt(xywhMatch[4], 10),
                width: parseInt(xywhMatch[3], 10),
                x: parseInt(xywhMatch[1], 10),
                y: parseInt(xywhMatch[2], 10),
              };
            }
          }

          annotations.push({
            content: bodyValue,
            id: a.id || `annotation-${annotations.length}`,
            region,
            target: typeof a.target === "string" ? a.target : undefined,
          });
        }
      },
    ],
  });

  traverse.traverseCanvas(canvas);

  function handleAddAnnotation(selected: boolean, annotation: Annotation) {
    const resources: Annotation[] = selected
      ? [...state.selectedAnnotations, annotation]
      : state.selectedAnnotations.filter((a) => a.id !== annotation.id);

    dispatch({ type: "setSelectedAnnotations", selectedAnnotations: resources });
  }

  if (!annotations.length) {
    return <p className={style.emptyMessage}>No annotations found on this canvas.</p>;
  }

  return (
    <div className={style.annotationsList}>
      {annotations.map((annotation) => {
        const isSelected = isAnnotationInSelectedAnnotations(annotation, state.selectedAnnotations);
        return (
          <div className={style.annotationItem} key={annotation.id}>
            <label className={style.annotationLabel}>
              <input
                checked={isSelected}
                type="checkbox"
                onChange={(e) => handleAddAnnotation(e.target.checked, annotation)}
              />
              <span className={style.annotationPreview}>
                <span
                  className={style.annotationContent}
                  dangerouslySetInnerHTML={{ __html: annotation.content }}
                />
                {annotation.region && (
                  <span className={style.annotationRegion}>
                    Region: {annotation.region.x},{annotation.region.y} {annotation.region.width}x
                    {annotation.region.height}
                  </span>
                )}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
};

type TabType = "media" | "annotations";

export const MediaDialog = () => {
  const { state, dispatch } = usePlugin();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialFocusRef = useRef<HTMLDivElement>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>("media");
  const canvasTitle = getLabelByUserLanguage(state.activeCanvas?.label ?? undefined)[0];

  function closeDialog() {
    dispatch({ type: "setMediaDialogState", state: "closed" });
  }

  useEffect(() => {
    if (state.mediaDialogState === "open") {
      dialogRef.current?.showModal();
      requestAnimationFrame(() => {
        initialFocusRef.current?.focus();
      });
    } else {
      dialogRef.current?.close();
    }
  }, [state.mediaDialogState]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      // When the dialog is closed by native means (Escape key, click outside, etc.)
      // update the React state to match
      if (state.mediaDialogState === "open") {
        dispatch({ type: "setMediaDialogState", state: "closed" });
      }
    };

    dialog.addEventListener("close", handleClose);

    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [state.mediaDialogState, dispatch]);

  // serialize the Canvas so it can traversed
  const canvas: Canvas = state.vault.serialize(
    { type: "Canvas", id: state.activeCanvas.id },
    serializeConfigPresentation3,
  );

  // NOTE: It is assumed that all media resources are images hosted on the internet
  // and that they can be used directly as the `src` for an `<img>` element.
  return (
    <Dialog
      aria-modal="true"
      position="visual_center"
      ref={dialogRef}
      width="stretched"
      onCloseCallback={closeDialog}
    >
      {state.mediaDialogState === "open" && (
        <>
          <div className={style.header}>
            <Heading level={"h3"}>Add content</Heading>
          </div>
          <p className={style.subtitle}>
            Add content from current canvas {canvasTitle?.length ? `(${canvasTitle})` : ""} to the
            chat
          </p>
          <div className={style.tabsContainer}>
            <div className={style.tabsList}>
              <Button
                className={style.tabButton}
                size="small"
                variant={selectedTab === "media" ? "primary" : "ghost"}
                onClick={() => setSelectedTab("media")}
              >
                Media
              </Button>
              <Button
                className={style.tabButton}
                size="small"
                variant={selectedTab === "annotations" ? "primary" : "ghost"}
                onClick={() => setSelectedTab("annotations")}
              >
                Annotations
              </Button>
            </div>
            <div className={style.tabDetails}>
              {selectedTab === "media" && (
                <div className={style.content}>
                  <CurrentView />
                  <Paintings canvas={canvas} />
                  {canvas.placeholderCanvas && (
                    <Placeholder placeholder={canvas.placeholderCanvas} />
                  )}
                  {canvas.thumbnail?.length && <Thumbnails thumbnails={canvas.thumbnail} />}
                </div>
              )}
              {selectedTab === "annotations" && (
                <div className={style.content}>
                  <Annotations canvas={canvas} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
};
