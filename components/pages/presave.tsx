import { SafeAreaContainer } from "@/components/safe-area-container";
import { ContextType, useMiniAppContext } from "@/hooks/use-miniapp-context";
import dynamic from "next/dynamic";

const PresaveComponent = dynamic(() => import("@/components/Presave"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function Presave() {
  const { type: contextType, context } = useMiniAppContext();
  return contextType === ContextType.Farcaster ? (
    <SafeAreaContainer insets={context.client.safeAreaInsets}>
      <PresaveComponent />
    </SafeAreaContainer>
  ) : (
    <SafeAreaContainer>
      <PresaveComponent />
    </SafeAreaContainer>
  );
}
