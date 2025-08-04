import { Button, Heading } from "@components";
import styles from "./style.module.css";

type Props = {
  models: string[];
  handleClick: (model: string) => void;
  handleBack: () => void;
};

export function ModelSelection({ models, handleClick, handleBack }: Props) {
  return (
    <div>
      <Heading level={"h3"}>Select a Model</Heading>
      <p>Please select a model to use with the selected provider.</p>
      <div className={styles.modelList}>
        {models.map((model) => (
          <Button key={model} onClick={() => handleClick(model)} variant="primary">
            {model}
          </Button>
        ))}
        <div>
          <Button type="button" variant="ghost" onClick={handleBack}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
