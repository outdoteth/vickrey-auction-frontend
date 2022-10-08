import { useEffect, useMemo, useState } from "react";
import { useAlchemy } from "./useAlchemy";

export const useNfts = ({ address, tokenAddress }) => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const alchemy = useAlchemy();

  const fetchMore = async () => {
    setLoading(true);

    console.log("fetching", tokenAddress);

    if (address) {
      // fetch address nfts
      let cachedPageKey;
      const raw = [];
      do {
        const { pageKey, ownedNfts } = await alchemy.nft.getNftsForOwner(
          address,
          {
            pageKey: cachedPageKey,
            contractAddresses: [tokenAddress],
            withMetadata: true,
          }
        );

        // todo: fucking alchemy piece of shit not working
        // cachedPageKey = pageKey;

        raw = raw.concat(ownedNfts);
      } while (cachedPageKey);

      const nfts = raw
        .sort((a, b) => a.tokenId - b.tokenId)
        .map(({ tokenId, rawMetadata: { image } }) => ({
          tokenId,
          image: image?.replace("ipfs://", "https://ipfs.io/ipfs/"),
        }));

      setNfts(nfts);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMore();
  }, [address, tokenAddress]);

  return [nfts, loading];
};
