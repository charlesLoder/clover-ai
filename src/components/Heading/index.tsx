import type { FC } from "react";
import style from "./style.module.css";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const Heading: FC<HeadingProps> = ({ level, children, ...props }) => {
  const Tag = level;
  return (
    <Tag {...props} className={style.header}>
      {children}
    </Tag>
  );
};
