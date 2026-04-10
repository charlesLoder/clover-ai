import { Button } from "@components";
import { usePlugin } from "@context";
import { Close, TextFile } from "@icons";
import type { Annotation } from "@types";
import style from "./style.module.css";

export interface SelectedAnnotationProps {
  annotation: Annotation;
}

export const SelectedAnnotation: React.FC<SelectedAnnotationProps> = ({ annotation }) => {
  const { dispatch, state } = usePlugin();

  function handleClick(id: Annotation["id"]) {
    const newAnnotations = state.selectedAnnotations.filter((a) => a.id !== id);
    dispatch({ type: "setSelectedAnnotations", selectedAnnotations: newAnnotations });
  }

  console.log(annotation.content);
  const truncatedContent =
    annotation.content.length > 15
      ? annotation.content.substring(0, 15) + "..."
      : annotation.content;

  return (
    <div className={style.selectedAnnotation}>
      <span className={style.annotationContent} title={truncatedContent}>
        <TextFile />
      </span>
      <Button
        aria-label="Remove annotation"
        shape="circle"
        size="small"
        title="Remove annotation"
        variant="secondary"
        onClick={() => handleClick(annotation.id)}
      >
        <Close />
      </Button>
    </div>
  );
};
