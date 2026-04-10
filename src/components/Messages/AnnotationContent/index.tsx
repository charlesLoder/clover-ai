import { AnnotationContent as IAnnotationContent, Role } from "@types";
import type { FC } from "react";
import { useState } from "react";
import { TextFile } from "@icons";
import style from "./style.module.css";

export interface AnnotationContentProps {
  role: Extract<Role, "user">;
  content: IAnnotationContent;
}

export const AnnotationContent: FC<AnnotationContentProps> = ({ content, role }) => {
  const [expanded, setExpanded] = useState(false);
  const rawContent = content.content.content;

  return (
    <div
      className={`${style.annotationContent} ${expanded ? style.expanded : ""}`}
      data-role={role}
      data-type="annotation-content"
      role="button"
      tabIndex={0}
      onClick={() => setExpanded(!expanded)}
    >
      <div className={style.header}>
        <TextFile />
        <span className={style.label}>{expanded ? "Annotation" : "Show more"}</span>
      </div>
      {expanded && (
        <div
          className={style.body}
          dangerouslySetInnerHTML={{ __html: rawContent }}
        />
      )}
    </div>
  );
};
