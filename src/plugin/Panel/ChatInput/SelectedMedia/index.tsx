import { Button, Figure } from "@components";
import { usePlugin } from "@context";
import { Close } from "@icons";
import { Media } from "@types";
import style from "./style.module.css";

export interface SelectedMediaProps {
  media: Media;
}
export const SelectedMedia: React.FC<SelectedMediaProps> = ({ media }) => {
  const { dispatch, state } = usePlugin();

  function handleClick(id: Media["id"]) {
    const newMedia = state.selectedMedia.filter((m) => m.id !== id);
    dispatch({ type: "setSelectedMedia", selectedMedia: newMedia });
  }
  return (
    <div className={style.selectedMedia}>
      <Figure height={"30px"} src={media.src} title={media.caption} width={"30px"} />
      <Button
        aria-label="Remove media"
        shape="circle"
        size="small"
        title="Remove media"
        variant="secondary"
        onClick={() => handleClick(media.id)}
      >
        <Close />
      </Button>
    </div>
  );
};
