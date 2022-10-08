import { allChains, configureChains, createClient, WagmiConfig } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { InjectedConnector } from "wagmi/connectors/injected";

const { chains, provider } = configureChains(
  [allChains.find(({ id }) => id == process.env.NEXT_PUBLIC_CHAIN_ID)],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID }),
    publicProvider(),
  ]
);

const wagmiClient = createClient({
  autoConnect: true,
  connectors: [new InjectedConnector({ chains })],
  provider,
});

export const EthereumProvider = ({ children }) => {
  return <WagmiConfig client={wagmiClient}>{children}</WagmiConfig>;
};
