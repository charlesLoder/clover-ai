import { Button, Heading } from "@components";
import type { Provider } from "../../index";
import styles from "./style.module.css";

export const ProviderSelection = ({
  allowed_providers = [],
  handleClick,
}: {
  allowed_providers: Provider[];
  handleClick: (provider: Provider) => void;
}) => {
  return (
    <div>
      <Heading level="h3">Select a Provider</Heading>
      <p>Please select a provider.</p>
      <div className={styles.providerList}>
        {allowed_providers.map((provider, i) => (
          <Button
            autoFocus={i === 0}
            key={provider}
            value={provider}
            variant="primary"
            onClick={(e) => handleClick(e.currentTarget.value as Provider)}
          >
            {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
};
