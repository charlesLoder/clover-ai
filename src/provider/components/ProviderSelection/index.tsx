import { Button } from "@components";
import type { Provider } from "../../index";

export const ProviderSelection = ({
  allowed_providers = [],
  handleClick,
}: {
  allowed_providers: Provider[];
  handleClick: (provider: Provider) => void;
}) => {
  return (
    <div>
      <h3 style={{ margin: 0 }}>Select a Provider</h3>
      <p>
        Please select a provider to use this feature. You will need to provide an API key for the
        selected provider.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--clover-ai-sizes-2)" }}>
        {allowed_providers.map((provider, i) => (
          <Button
            autoFocus={i === 0}
            key={provider}
            value={provider}
            variant="ghost"
            onClick={(e) => handleClick(e.currentTarget.value as Provider)}
          >
            {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
};
