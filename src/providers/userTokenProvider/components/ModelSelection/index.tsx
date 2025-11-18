import { Button, Heading } from "@components";
import styles from "./style.module.css";

type Props = {
  handleBack: () => void;
  handleClick: (model: string) => void;
  models: string[];
};

export function ModelSelection({ handleBack, handleClick, models }: Props) {
  return (
    <div>
      <Heading level={"h3"}>Select a Model</Heading>
      <p>Please select a model to use with the selected provider.</p>
      <div className={styles.modelList}>
        {models.map((model) => (
          <Button key={model} variant="primary" onClick={() => handleClick(model)}>
            {model}
          </Button>
        ))}
        <div>
          <Button variant="ghost" onClick={handleBack}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
