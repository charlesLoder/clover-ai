import { Dialog, Heading, ImageSelect } from "@components";
import { usePlugin } from "@context";
import { serializeConfigPresentation3, Traverse } from "@iiif/parser";
import type { Canvas, ContentResource } from "@iiif/presentation-3";
import type { Media } from "@types";
import { getLabelByUserLanguage, updateIIIFImageRequestURI } from "@utils";
import { FC, useEffect, useRef } from "react";
import style from "./style.module.css";

function isMediaInSelectedMedia(media: Media, selectedMedia: Media[]): boolean {
  return selectedMedia.some((m) => m.id === media.id);
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
          key={m.id}
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
          key={m.id}
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

  const media: Media[] = thumbnails.reduce((acc, thumbnail, i) => {
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
  }, [] as Media[]);

  return (
    <>
      {media.map((thumbnail, index) => (
        <ImageSelect
          figcaption={thumbnail.caption}
          key={index}
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

export const MediaDialog = () => {
  const { state, dispatch } = usePlugin();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialFocusRef = useRef<HTMLDivElement>(null);
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
      {/* 
        some computations in this component can be expensive
        so only render the dialog content when the dialog is open
      */}
      {state.mediaDialogState === "open" && (
        <>
          <div className={style.header}>
            <Heading level={"h3"}>Add media</Heading>
          </div>
          <p className={style.subtitle}>
            Add media from current canvas {canvasTitle?.length ? `(${canvasTitle})` : ""} to the
            chat
          </p>
          <div className={style.contentContainer}>
            <div className={style.content}>
              <CurrentView />
              <Paintings canvas={canvas} />
              {canvas.placeholderCanvas && <Placeholder placeholder={canvas.placeholderCanvas} />}
              {canvas.thumbnail?.length && <Thumbnails thumbnails={canvas.thumbnail} />}
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
};
