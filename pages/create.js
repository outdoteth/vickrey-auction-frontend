import { Contract } from "ethers";
import Head from "next/head";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { erc721ABI, useAccount, useBlockNumber, useSigner } from "wagmi";
import { Input } from "../components/core/Input";
import { NftSelect } from "../components/core/NftSelect";
import * as nftCollections from "../ethereum/nftCollections.json";
import auctionFactoryAbi from "../contracts/auctionFactory.abi.json";
import { defaultAbiCoder } from "ethers/lib/utils";

const Container = styled.div`
  display: grid;
  row-gap: 24px;

  h1 {
    text-align: center;
  }
`;

export default function Create() {
  const { data: signer } = useSigner();
  const { address } = useAccount();
  const [selectedNft, setSelectedNft] = useState();
  const [tokenAddress, setTokenAddress] = useState(nftCollections.tokens[0].address);
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const [approved, setApproved] = useState();
  const [duration, setDuration] = useState();

  useEffect(() => {
    const getApproved = async () => {
      const token = new Contract(tokenAddress, erc721ABI, signer);

      const isApprovedForAll = await token.isApprovedForAll(address, process.env.NEXT_PUBLIC_AUCTION_ADDRESS);

      setApproved(isApprovedForAll);
    };

    getApproved();
  }, [blockNumber, address, tokenAddress]);

  const approve = async () => {
    const token = new Contract(tokenAddress, erc721ABI, signer);

    const tx = await token.setApprovalForAll(process.env.NEXT_PUBLIC_AUCTION_ADDRESS, true);

    await tx.wait();

    alert("Approved token for spending");
  };

  const create = async () => {
    const auctionFactory = new Contract(process.env.NEXT_PUBLIC_AUCTION_ADDRESS, auctionFactoryAbi, signer);
    const token = new Contract(tokenAddress, erc721ABI, signer);

    const tx = await token["safeTransferFrom(address,address,uint256,bytes)"](
      address,
      process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
      selectedNft,
      auctionFactory.interface.encodeFunctionData("innerCreateAuction", [address, blockNumber + Math.floor((duration * 1 * 60) / 12)])
    );

    await tx.wait();

    alert("Created new auction");
  };

  return (
    <div>
      <Head>
        <title>Vickrey Auction</title>
      </Head>

      <Container>
        <h1>Vickrey Auction</h1>

        <NftSelect value={selectedNft} onChange={setSelectedNft} tokenAddress={tokenAddress} />

        <div className="input-and-label">
          <label htmlFor="auction-duration">Auction duration (hours)</label>
          <Input id="auction-duration" placeholder="Enter hours..." type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>

        {approved ? <button onClick={() => create()}>Create Auction</button> : <button onClick={() => approve()}>Approve</button>}
      </Container>
    </div>
  );
}
