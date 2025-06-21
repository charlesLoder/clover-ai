import type { Plugin as CloverPlugin } from "@samvera/clover-iiif";
import styles from "./style.module.css";

export function PluginControl(props: CloverPlugin) {
  const { useViewerDispatch } = props;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerDispatch: any = useViewerDispatch();

  function clickHandler() {
    viewerDispatch({
      type: "updateInformationPanelResource",
      informationPanelResource: "clover-ai",
    });

    // if already closed, this will open it
    // but it will unfocus the clover-ai panel
    viewerDispatch({
      type: "updateInformationOpen",
      isInformationOpen: true,
    });
  }

  return (
    <button className={styles.pluginButton} onClick={clickHandler}>
      Ai
    </button>
  );
}
