import styled from "styled-components";
import { useAccount } from "wagmi";
import { useNfts } from "../../hooks/useNfts";

const Container = styled.div`
  display: grid;

  .img-container {
    display: flex;
    flex-wrap: wrap;
  }
`;

const ImgContainer = styled.img`
  height: 64px;
  margin: 1px;
  padding: 2px;
  cursor: pointer;
  border: 2px dashed ${({ selected }) => (selected ? "red" : "transparent")};
`;

export const NftSelect = ({ tokenAddress, value, onChange }) => {
  const { address } = useAccount();
  const [nfts, loading] = useNfts({ address, tokenAddress });

  return (
    <Container>
      <h2>Select an NFT</h2>

      <div className="img-container">
        {loading
          ? "Loading..."
          : nfts
              .slice(0, 20)
              .map(({ image, tokenId }) => (
                <ImgContainer
                  src={image}
                  selected={value == tokenId}
                  onClick={() => onChange(tokenId)}
                />
              ))}
      </div>
    </Container>
  );
};
