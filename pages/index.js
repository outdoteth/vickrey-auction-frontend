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
      const auctionFactory = new Contract(process.env.NEXT_PUBLIC_AUCTION_ADDRESS, auctionFactoryAbi, signer);
      let creations;
      try {
        console.log(auctionFactory);
        creations = await auctionFactory.queryFilter("AuctionCreated");
        console.log("creations", creations);
      } catch (e) {
        console.log("Could not get AuctionCreated: ", e);
      }

      const auctionData = creations.map(({ args, ...v }) => ({
        id: args.auction,
        creationTimestamp: v.blockNumber,
        endTimestamp: args.revealStartBlock.toNumber(),
        duration: args.revealStartBlock.toNumber() - v.blockNumber,
        tokenId: args.tokenId.toString(),
        tokenAddress: args.collection,
      }));

      console.log(auctionData);

      // const auctionData = [
      //   {
      //     id: "123",
      //     creationTimestamp: 100,
      //     endTimestamp: 500,
      //     duration: 100,
      //     tokenId: 1,
      //     tokenAddress: "0x3f161961e90eb149f392be1e831bb7060c90f284",
      //   },
      // ];

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
          : auctions
              .slice()
              .reverse()
              .map(({ id, creationTimestamp, endTimestamp, duration, image }) => (
                <Link href={"/auction/" + id} key={id}>
                  <ListItem key={id}>
                    <img src={image} />

                    <div>
                      <p>Auction duration: {duration} blocks</p>
                      <p>Auction ends in: {Math.max(endTimestamp - blockNumber, 0)} blocks</p>
                      <p>Creation: block #{creationTimestamp}</p>
                      <p>End: block #{endTimestamp}</p>
                    </div>
                  </ListItem>
                </Link>
              ))}
      </Container>
    </div>
  );
}
