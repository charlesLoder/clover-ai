import { Figure } from "@components";
import { MediaContent as IMediaContent, Role } from "@types";
import type { FC } from "react";

export interface MediaContentProps {
  role: Extract<Role, "user">;
  content: IMediaContent;
}

/**
 * This component renders media content within a message.
 * It essentially just a wrapper around the `<Figure>` component
 */
export const MediaContent: FC<MediaContentProps> = ({ content, role }) => {
  return (
    <div data-role={role}>
      <Figure figcaption={content.content.caption || ""} src={content.content.src} />
    </div>
  );
};
