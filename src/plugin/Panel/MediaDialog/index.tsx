import { Dialog, Heading, ImageSelect } from "@components";
import { usePlugin } from "@context";
import type { AnnotationBody, Canvas, IIIFExternalWebResource } from "@iiif/presentation-3";
import type { Media } from "@types";
import { getLabelByUserLanguage } from "@utils";
import { FC, useEffect, useRef } from "react";
import style from "./style.module.css";

function isMediaInSelectedMedia(media: Media, selectedMedia: Media[]): boolean {
  return selectedMedia.some((m) => m.id === media.id);
}

const CurrentView = () => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    const resources: Media[] = selected
      ? [...state.selectedMedia, media]
      : state.selectedMedia.filter((m) => m.id !== media.id);

    dispatch({
      type: "setSelectedMedia",
      selectedMedia: resources,
    });
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

const Placeholder = () => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    const resources: Media[] = selected
      ? [...state.selectedMedia, media]
      : state.selectedMedia.filter((m) => m.id !== media.id);

    dispatch({
      type: "setSelectedMedia",
      selectedMedia: resources,
    });
  }

  function formatCaption({ height, width }: { height?: number; width?: number }) {
    const tiltle = getLabelByUserLanguage(state.activeCanvas?.label ?? {})[0];
    return `Default\n${tiltle} (${width ?? "?"} x ${height ?? "?"})`;
  }

  function isContentResource(body: AnnotationBody): body is IIIFExternalWebResource {
    return typeof body !== "string" && "id" in body && "width" in body && "height" in body;
  }

  if (!state?.activeCanvas?.placeholderCanvas?.items) {
    return <></>;
  }

  const placeholder = state.activeCanvas.placeholderCanvas;
  if (!placeholder) {
    return <></>;
  }

  const items = placeholder.items;
  if (!items || !items.length) {
    return <></>;
  }

  const itemsItems = items
    .map((i) => i.items)
    .filter((i) => i)
    .flat();

  if (!itemsItems.length) {
    return <></>;
  }

  const paintings = itemsItems.filter((i) => i?.motivation === "painting").flat();

  const bodies = paintings
    .map((i) => (i?.body && Array.isArray(i.body) ? i.body : ([i?.body] as AnnotationBody[])))
    .filter((i) => i && i.length > 0)
    .flat();

  if (!bodies.length) {
    return <></>;
  }

  const defaultPainting = bodies.find((b) => isContentResource(b));

  if (!defaultPainting) {
    return <></>;
  }

  const id = defaultPainting.id;
  const paintingMedia: Media = {
    type: "image",
    id: id || "",
    src: id || "",
    caption: formatCaption({
      width: defaultPainting.width,
      height: defaultPainting.height,
    }),
  };
  return (
    <>
      {id && (
        <ImageSelect
          figcaption={paintingMedia.caption}
          imgObjectFit="contain"
          src={id}
          initialState={
            isMediaInSelectedMedia(paintingMedia, state.selectedMedia) ? "selected" : "unselected"
          }
          onSelectionChange={(selected) => handleAddMedia(selected, paintingMedia)}
        />
      )}
    </>
  );
};

const Thumbnail: FC<{
  index: number;
  numOfThumbnails: number;
  thumbnail: IIIFExternalWebResource;
}> = ({ thumbnail, index, numOfThumbnails }) => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    const resources: Media[] = selected
      ? [...state.selectedMedia, media]
      : state.selectedMedia.filter((m) => m.id !== media.id);

    dispatch({
      type: "setSelectedMedia",
      selectedMedia: resources,
    });
  }

  function formatCaption() {
    const tiltle = getLabelByUserLanguage(state.activeCanvas?.label ?? {})[0];
    return `Thumbnail ${numOfThumbnails > 1 ? `(${index + 1})` : ""}\n${tiltle} (${thumbnail.width ?? "?"} x ${thumbnail.height ?? "?"})`;
  }

  const id = thumbnail.id;
  const thumbnailMedia: Media = {
    type: "image",
    id: id || "",
    src: id || "",
    caption: formatCaption(),
  };
  return (
    <>
      {id && (
        <ImageSelect
          figcaption={formatCaption()}
          src={thumbnail.id}
          initialState={
            isMediaInSelectedMedia(thumbnailMedia, state.selectedMedia) ? "selected" : "unselected"
          }
          onSelectionChange={(selected) => handleAddMedia(selected, thumbnailMedia)}
        />
      )}
    </>
  );
};

export const MediaDialog = () => {
  const { state, dispatch } = usePlugin();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialFocusRef = useRef<HTMLDivElement>(null);

  function closeDialog() {
    dispatch({ type: "setMediaDialogState", state: "closed" });
  }

  function isWebResource(
    resource: NonNullable<Canvas["thumbnail"]>[0],
  ): resource is IIIFExternalWebResource {
    return "width" in resource && "height" in resource;
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
          <p className={style.subtitle}>Add media to the chat</p>
          <div className={style.contentContainer}>
            <div className={style.content}>
              <CurrentView />
              <Placeholder />
              {state?.activeCanvas?.thumbnail?.length && (
                <>
                  {state.activeCanvas.thumbnail
                    .filter(isWebResource)
                    .map((thumbnail, i, thumbnails) => (
                      <Thumbnail
                        index={i}
                        key={i}
                        numOfThumbnails={thumbnails.length}
                        thumbnail={thumbnail}
                      />
                    ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
};
