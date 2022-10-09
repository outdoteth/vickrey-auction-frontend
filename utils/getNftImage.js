export const getNftImage = async (alchemy, tokenAddress, tokenId) => {
  const metadata = await alchemy.nft.getNftMetadata(tokenAddress, tokenId);
  return metadata.rawMetadata.image;
};
