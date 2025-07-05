import { Dialog, Heading, ImageSelect } from "@components";
import { usePlugin } from "@context";
import type { CanvasNormalized, ContentResourceNormalized } from "@iiif/presentation-3-normalized";
import type { Media } from "@types";
import { getLabelByUserLanguage } from "@utils";
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

const Placeholder = () => {
  const { state, dispatch } = usePlugin();

  function handleAddMedia(selected: boolean, media: Media) {
    handleSelectedMedia(selected, media, state.selectedMedia, (resources) =>
      dispatch({ type: "setSelectedMedia", selectedMedia: resources }),
    );
  }

  // Though the resource may have `width` and `height` properties
  // it's type, ContentResource, does not include them.
  // To ensure we can access them safely,
  // cast the resource to `any` and then try to access them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getDimensions(resource: any): { height: number; width: number } {
    return {
      height: resource.height || 0,
      width: resource.width || 0,
    };
  }

  function formatCaption(resource: ContentResourceNormalized) {
    const { width, height } = getDimensions(resource);
    const dimensions = width && height ? `\n(${width} x ${height})` : "";
    return `Placeholder${dimensions}`;
  }

  const activeCanvas = state.activeCanvas;

  if (!activeCanvas.placeholderCanvas) {
    return <></>;
  }

  const placeholderResource = state.vault.get({
    type: "Canvas",
    id: activeCanvas.placeholderCanvas.id,
  });

  const annotationItems = state.vault.get({
    type: "AnnotationPage",
    id: placeholderResource.items.map((item) => item.id),
  });

  const annotationPageItems = state.vault.get({
    type: "Annotation",
    id: annotationItems.items.map((item) => item.id),
  });

  const body = state.vault.get({
    type: "ContentResource",
    id: annotationPageItems.body.map((b) => b.id),
  });

  const id = body.id;
  const paintingMedia: Media = {
    type: "image",
    id: id || "",
    src: id || "",
    caption: formatCaption(body),
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
  thumbnail: CanvasNormalized["thumbnail"][0];
}> = ({ thumbnail }) => {
  const { state, dispatch } = usePlugin();
  const resource = state.vault.get({ type: "ContentResource", id: thumbnail.id });

  function handleAddMedia(selected: boolean, media: Media) {
    handleSelectedMedia(selected, media, state.selectedMedia, (resources) =>
      dispatch({ type: "setSelectedMedia", selectedMedia: resources }),
    );
  }

  // Though the resource may have `width` and `height` properties
  // it's type, ContentResource, does not include them.
  // To ensure we can access them safely,
  // cast the resource to `any` and then try to access them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getDimensions(resource: any): { height: number; width: number } {
    return {
      height: resource.height || 0,
      width: resource.width || 0,
    };
  }

  function formatCaption(resource: ContentResourceNormalized) {
    const { width, height } = getDimensions(resource);
    const dimensions = width && height ? `\n(${width} x ${height})` : "";
    return `Thumbnail${dimensions}`;
  }

  const id = thumbnail.id;
  const thumbnailMedia: Media = {
    type: "image",
    id: id || "",
    src: id || "",
    caption: formatCaption(resource),
  };

  return (
    <>
      {id && (
        <ImageSelect
          figcaption={thumbnailMedia.caption}
          src={thumbnailMedia.src}
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
  const canvasTitle = getLabelByUserLanguage(state.activeCanvas.label)[0];

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
              <Placeholder />
              {state.activeCanvas.thumbnail.length > 0 && (
                <>
                  {state.activeCanvas.thumbnail.map((thumbnail, i) => (
                    <Thumbnail key={`thumbnail-${i}`} thumbnail={thumbnail} />
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
