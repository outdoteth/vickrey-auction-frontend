import { useAccount, useConnect, useEnsName, useNetwork } from "wagmi";
import { ErrorText } from "./ErrorText";

export const ConnectWalletButton = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const {
    connect,
    connectors: [connector],
  } = useConnect();
  const { chain } = useNetwork();

  if (chain?.unsupported && !children)
    return <ErrorText>Connect to goerli</ErrorText>;
  if (isConnected) return children ? children : <div>{ensName ?? address}</div>;

  return <button onClick={() => connect({ connector })}>Connect Wallet</button>;
};
