import { Network, Alchemy } from "alchemy-sdk";
import { useMemo } from "react";

export const useAlchemy = () => {
  const settings = {
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID,
    network: process.env.NEXT_PUBLIC_CHAIN_ID == 5 ? Network.ETH_GOERLI : Network.OPT_GOERLI,
    maxRetries: 10,
  };

  const web3 = useMemo(() => {
    return new Alchemy(settings);
  }, []);

  return web3;
};
