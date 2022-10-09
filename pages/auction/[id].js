import { AlchemyProvider } from "@ethersproject/providers";
import { Alchemy, Network } from "alchemy-sdk";
import { constants, Contract, utils } from "ethers";
import { defaultAbiCoder, keccak256, parseEther } from "ethers/lib/utils";
import Head from "next/head";
import prettyMilliseconds from "pretty-ms";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useAccount, useBlockNumber, useSigner, useSignTypedData } from "wagmi";
import { Input } from "../../components/core/Input";
import auctionFactoryAbi from "../../contracts/auctionFactory.abi.json";
import auctionAbi from "../../contracts/auction.abi.json";
import { getNftImage } from "../../utils/getNftImage";
import { getAccountProofEthers } from "../mpt_utils";

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
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber();

  const biddingFinished = blockNumber > endTimestamp;
  const revealFinished = blockNumber > revealEndTimestamp;

  const reveal = async (endTimestamp) => {
    console.log("revealing");
    const auction = new Contract(constants.AddressZero, auctionAbi, signer);

    // await auction.startReveal();

    console.log("revealing");

    console.log(
      address,
      parseEther(bidAmount),
      salt,
      parseEther(bidAmount),
      []
    );

    const tx = await auction.reveal(
      address,
      parseEther(bidAmount),
      salt,
      parseEther(bidAmount)
      // accountProof.header,
      // accountProof.fullAccountProof,
      // accountProof.state1,
      // accountProof.state2,
      // accountProof.state3,
      // accountProof.accountAddress
    );

    await tx.wait();

    alert("Revealed bid");
  };

  const withdraw = async () => {
    const auction = new Contract(id, auctionAbi, signer);

    const tx = await auction.pull(address);
    await tx.wait();

    alert("Withdrew bid");
  };

  const claim = async () => {
    const auction = new Contract(id, auctionAbi, signer);

    const tx = await auction.claimWin(tokenAddress, tokenId);
    await tx.wait();

    alert("Claimed NFT");
  };

  return (
    <BidItemContainer>
      <div>{bidAmount} ETH</div>

      {biddingFinished && (
        <button onClick={() => reveal(endTimestamp)}>Reveal</button>
      )}
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

  const { data: blockNumber } = useBlockNumber();

  const biddingFinished = blockNumber > endTimestamp;
  const revealFinished = blockNumber > revealEndTimestamp;

  console.log(biddingFinished, revealFinished);

  useEffect(() => {
    setBids(JSON.parse(localStorage.getItem(id) || "[]"));
  }, []);

  const placeBid = async () => {
    // compute the create2 destination
    // save the salt and bid in localstorage
    // send the transaction
    const random = Math.floor(Math.random() * 100000000000);

    const auction = new Contract(id, auctionAbi, signer);

    const subsalt = keccak256(Date.now());
    console.log(subsalt);
    const {
      salt,
      depositAddr: create2Address,
    } = await auction.getBidDepositAddr(
      address,
      parseEther(bidAmount),
      subsalt
    );

    console.log("create2 Address", create2Address);

    const tx = await signer.sendTransaction({
      to: create2Address,
      value: parseEther(bidAmount),
    });

    const newBids = bids.concat({ salt: subsalt, bidAmount, create2Address });
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

  const finalise = async () => {
    const auctionContract = new Contract(id, auctionAbi, signer);

    const tx = await auctionContract.claimWin(
      auction.tokenAddress,
      auction.tokenId
    );

    await tx.wait();

    alert("Finalised auction");
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

            <p>Auction duration: {duration} blocks</p>
            <p>
              Auction ends in: {Math.max(endTimestamp - blockNumber, 0)} blocks
            </p>
            <p>Creation: block #{creationTimestamp}</p>
            <p>End: block #{endTimestamp}</p>
          </div>
        </div>

        {owner !== address && !biddingFinished ? (
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
          owner === address &&
          revealFinished && (
            <button onClick={() => withdrawWinningBid()}>
              Withdraw Winning bid
            </button>
          )
        )}

        {revealFinished && (
          <button onClick={() => finalise()}>Finalise Auction</button>
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

  const creations = await auctionFactory.queryFilter(
    auctionFactory.filters.AuctionCreated(id)
  );

  const rawAuction = creations[0];
  console.log(creations);

  // todo: add fetching here
  //   const auction = auctionFactory.auctions(id);

  const tx = await provider.getTransaction(rawAuction.transactionHash);

  const auction = {
    id,
    creationTimestamp: rawAuction.blockNumber,
    revealEndTimestamp: rawAuction.args.revealStartBlock.toNumber() + 7200,
    endTimestamp: rawAuction.args.revealStartBlock.toNumber(),
    duration:
      rawAuction.args.revealStartBlock.toNumber() - rawAuction.blockNumber,
    tokenId: rawAuction.args.tokenId.toString(),
    owner: tx.from,
    tokenAddress: rawAuction.args.collection,
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
