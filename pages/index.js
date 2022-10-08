import { Contract } from "ethers";
import Head from "next/head";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useBlockNumber, useSigner } from "wagmi";
import auctionFactoryAbi from "../contracts/auctionFactory.abi.json";
import prettyMilliseconds from "pretty-ms";
import { useAlchemy } from "../hooks/useAlchemy";
import Link from "next/link";
import { getNftImage } from "../utils/getNftImage";

const Container = styled.div`
  display: grid;
  row-gap: 24px;

  h1 {
    text-align: center;
  }
`;

const ListItem = styled.div`
  padding: 12px;
  border: 1px solid black;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 12px;

  div {
    height: 100%;
    display: grid;
  }

  img {
    height: 64px;
  }

  cursor: pointer;

  &:hover {
    border: 1px solid blue;
  }
`;

export default function Home() {
  // get all auctions using events
  const { data: signer } = useSigner();
  const [loading, setLoading] = useState();
  const [auctions, setAuctions] = useState([]);
  const { data: blockNumber } = useBlockNumber();
  const alchemy = useAlchemy();

  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);

      const auctionFactory = new Contract(
        process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
        auctionFactoryAbi,
        signer
      );

      const creations = await auctionFactory.queryFilter("AuctionCreated");
      // console.log("creations", creations);

      const auctionData = [
        {
          id: "123",
          creationTimestamp: 100,
          endTimestamp: 500,
          duration: 100,
          tokenId: 1,
          tokenAddress: "0x3f161961e90eb149f392be1e831bb7060c90f284",
        },
        {
          id: "124",
          creationTimestamp: 100,
          endTimestamp: 500,
          duration: 100,
          tokenId: 4,
          tokenAddress: "0x3f161961e90eb149f392be1e831bb7060c90f284",
        },
        {
          id: "126",
          creationTimestamp: 100,
          endTimestamp: 500,
          duration: 100,
          tokenId: 18,
          tokenAddress: "0x3f161961e90eb149f392be1e831bb7060c90f284",
        },
      ];

      const auctions = await Promise.all(
        auctionData.map(async (v) => ({
          ...v,
          image: await getNftImage(alchemy, v.tokenAddress, v.tokenId),
        }))
      );

      setAuctions(auctions);

      setLoading(false);
    };

    fetchAuctions();
  }, [blockNumber]);

  return (
    <div>
      <Head>
        <title>Vickrey Auction</title>
      </Head>

      <Container>
        <h1>Vickrey Auction</h1>

        {loading
          ? "Loading..."
          : auctions.map(
              ({ id, creationTimestamp, endTimestamp, duration, image }) => (
                <Link href={"/auction/" + id} key={id}>
                  <ListItem key={id}>
                    <img src={image} />

                    <div>
                      <p>
                        Auction duration: {prettyMilliseconds(duration * 1000)}
                      </p>
                      <p>
                        Auction ends in:{" "}
                        {prettyMilliseconds(
                          Math.max(
                            endTimestamp * 1000 - new Date().getTime(),
                            0
                          )
                        )}
                      </p>
                      <p>
                        Creation: {new Date(creationTimestamp).toISOString()}
                      </p>
                      <p>End: {new Date(endTimestamp).toISOString()}</p>
                    </div>
                  </ListItem>
                </Link>
              )
            )}
      </Container>
    </div>
  );
}
