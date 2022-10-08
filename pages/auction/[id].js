import { AlchemyProvider } from "@ethersproject/providers";
import { Alchemy, Network } from "alchemy-sdk";
import { Contract, utils } from "ethers";
import { defaultAbiCoder, keccak256, parseEther } from "ethers/lib/utils";
import Head from "next/head";
import prettyMilliseconds from "pretty-ms";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useAccount, useSigner, useSignTypedData } from "wagmi";
import { Input } from "../../components/core/Input";
import auctionFactoryAbi from "../../contracts/auctionFactory.abi.json";
import { getNftImage } from "../../utils/getNftImage";

const Container = styled.div`
  display: grid;
  row-gap: 24px;

  h1 {
    text-align: center;
  }

  .preview {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 24px;

    img {
      height: 128px;
    }

    .metadata {
      display: grid;
      row-gap: 8px;
      height: fit-content;
    }
  }
`;

const BidItemContainer = styled.div`
  display: grid;
  row-gap: 8px;
  border: 1px solid black;
  width: fit-content;
  padding: 4px;
`;

const BidItem = ({ bidAmount, salt, create2Address, auction }) => {
  const {
    id,
    creationTimestamp,
    endTimestamp,
    duration,
    image,
    revealEndTimestamp,
    owner,
  } = auction;

  const { data: signer } = useSigner();
  const [winningBid, setWinningBid] = useState(true);

  const biddingFinished = new Date().getTime() > endTimestamp * 1000;
  const revealFinished = new Date().getTime() > revealEndTimestamp * 1000;

  useEffect(() => {
    const updateWinningBid = async () => {
      const auctionFactory = new Contract(
        process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
        auctionFactoryAbi,
        signer
      );

      const winningBid = await auctionFactory.winningBid(create2Address);
      setWinningBid(winningBid);
    };

    updateWinningBid();
  }, []);

  const reveal = async () => {
    const auctionFactory = new Contract(
      process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
      auctionFactoryAbi,
      signer
    );

    const tx = await auctionFactory.reveal(
      address,
      bidAmount,
      salt,
      balAtSnapshot,
      proof
    );

    await tx.wait();

    alert("Revealed bid");
  };

  const withdraw = async () => {
    const auctionFactory = new Contract(
      process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
      auctionFactoryAbi,
      signer
    );

    const tx = await auctionFactory.withdraw();
    await tx.wait();

    alert("Withdrew bid");
  };

  const claim = async () => {
    const auctionFactory = new Contract(
      process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
      auctionFactoryAbi,
      signer
    );

    const tx = await auctionFactory.claim();
    await tx.wait();

    alert("Claimed NFT");
  };

  return (
    <BidItemContainer>
      <div>{bidAmount} ETH</div>
      {winningBid && (
        <button onClick={() => claim()}>Claim NFT (Winning Bid)</button>
      )}
      {biddingFinished && <button onClick={() => reveal()}>Reveal</button>}
      {revealFinished && <button onClick={() => withdraw()}>Withdraw</button>}
    </BidItemContainer>
  );
};

export default function Auction({ auction }) {
  const {
    id,
    creationTimestamp,
    endTimestamp,
    duration,
    image,
    revealEndTimestamp,
    owner,
  } = auction;

  const { address } = useAccount();
  const { data: signer } = useSigner();
  const [bidAmount, setBidAmount] = useState();
  const [bids, setBids] = useState([]);

  console.log("reveal", revealEndTimestamp);

  const biddingFinished = new Date().getTime() > endTimestamp * 1000;
  const revealFinished = new Date().getTime() > revealEndTimestamp * 1000;

  useEffect(() => {
    setBids(JSON.parse(localStorage.getItem(id) || "[]"));
  }, []);

  const placeBid = async () => {
    // compute the create2 destination
    // save the salt and bid in localstorage
    // send the transaction
    const random = Math.floor(Math.random() * 100000000000);
    const data = defaultAbiCoder.encode(
      ["address", "uint256", "uint256"],
      [address, parseEther(bidAmount), random]
    );

    const salt = keccak256(data);
    const from = process.env.NEXT_PUBLIC_AUCTION_ADDRESS;
    const initCode = process.env.NEXT_PUBLIC_AUCTION_INITCODE;
    const initCodeHash = keccak256(initCode);
    const create2Address = utils.getCreate2Address(from, salt, initCodeHash);

    console.log("create2 Address", create2Address);

    const tx = await signer.sendTransaction({
      to: create2Address,
      value: parseEther(bidAmount),
    });

    const newBids = bids.concat({ salt, bidAmount, create2Address });
    localStorage.setItem(id, JSON.stringify(newBids));
    setBids(newBids);

    await tx.wait();

    alert("Placed bid");
  };

  const withdrawWinningBid = async () => {
    const auctionFactory = new Contract(
      process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
      auctionFactoryAbi,
      signer
    );

    const tx = await auctionFactory.withdrawWinningBid();
    await tx.wait();

    alert("Claimed highest bid from contract");
  };

  return (
    <div>
      <Head>
        <title>Vickrey Auction</title>
      </Head>

      <Container>
        <h1>Vickrey Auction</h1>

        <div className="preview">
          <img src={image} />

          <div className="metadata">
            <h2>Metadata</h2>

            <p>Auction duration: {prettyMilliseconds(duration * 1000)}</p>
            <p>
              Auction ends in:{" "}
              {prettyMilliseconds(
                Math.max(endTimestamp * 1000 - new Date().getTime(), 0)
              )}
            </p>
            <p>Creation: {new Date(creationTimestamp).toISOString()}</p>
            <p>End: {new Date(endTimestamp).toISOString()}</p>
          </div>
        </div>

        {owner !== address && revealFinished ? (
          <>
            <div className="input-and-label">
              <label htmlFor="bid-amount">Hidden bid amount (ETH)</label>
              <Input
                id="bid-amount"
                placeholder="Enter ETH amount..."
                type="number"
                onChange={(e) => setBidAmount(e.target.value)}
                value={bidAmount}
              />
            </div>

            <button onClick={() => placeBid()}>Place Hidden Bid</button>
          </>
        ) : (
          revealFinished && (
            <button onClick={() => withdrawWinningBid()}>
              Withdraw Winning bid
            </button>
          )
        )}

        <h2>Your bids</h2>

        <div>
          {bids.length === 0
            ? "(No bids here)"
            : bids.map(({ bidAmount, salt, create2Address }) => (
                <BidItem
                  key={salt}
                  bidAmount={bidAmount}
                  salt={salt}
                  auction={auction}
                  create2Address={create2Address}
                />
              ))}
        </div>
      </Container>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.query;

  const provider = new AlchemyProvider(
    "goerli",
    process.env.NEXT_PUBLIC_ALCHEMY_ID
  );

  const auctionFactory = new Contract(
    process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
    auctionFactoryAbi,
    provider
  );

  // todo: add fetching here
  //   const auction = auctionFactory.auctions(id);

  const auction = {
    id,
    creationTimestamp: 100,
    revealEndTimestamp: 166519890,
    endTimestamp: 1665198890,
    duration: 100,
    tokenId: 1,
    owner: "0xAc314DfCe6a883195F6516A34F978C8C2726AF48",
    tokenAddress: "0x3f161961e90eb149f392be1e831bb7060c90f284",
  };

  const alchemy = new Alchemy({
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID,
    network: Network.ETH_GOERLI,
    maxRetries: 10,
  });

  auction.image = await getNftImage(
    alchemy,
    auction.tokenAddress,
    auction.tokenId
  );

  return {
    props: { auction },
  };
}
