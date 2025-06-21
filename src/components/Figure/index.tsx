import style from "./style.module.css";

export interface FigureProps
  extends React.HTMLAttributes<HTMLImageElement>,
    React.ImgHTMLAttributes<HTMLImageElement> {
  figcaption?: string;
  imgObjectFit?: React.CSSProperties["objectFit"];
}

export const Figure: React.FC<FigureProps> = ({ figcaption, imgObjectFit = "cover", ...props }) => {
  return (
    <figure className={style.figure}>
      {props.src && (
        <img
          {...props}
          data-objectfit={imgObjectFit}
          height={props.height || 200}
          width={props.width || 200}
        />
      )}
      {figcaption && <figcaption>{figcaption}</figcaption>}
    </figure>
  );
};
