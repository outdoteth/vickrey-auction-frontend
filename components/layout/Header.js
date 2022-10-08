import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import styled from "styled-components";
import { ConnectWalletButton } from "../core/ConnectWalletButton";

const Container = styled.nav`
  display: grid;
  row-gap: 24px;

  .links {
    display: flex;
    justify-content: space-around;
    width: fit-content;
    margin: 0 12px;
    justify-self: center;
  }

  .connect-wallet {
    justify-self: center;
  }
`;

const LinkItem = styled.a`
  color: ${({ selected }) => (selected ? "black" : "grey")};
  text-decoration: ${({ selected }) => (selected ? "underline" : "none")};
  margin: 0 12px;
`;

export const Header = () => {
  const router = useRouter();

  return (
    <Container>
      <div className="links">
        {[
          { name: "Open Auctions", link: "/" },
          { name: "Create Auction", link: "/create" },
        ].map(({ name, link }) => (
          <Link href={link} passHref key={link}>
            <LinkItem selected={router.route === link}>{name}</LinkItem>
          </Link>
        ))}
      </div>

      <div className="connect-wallet">
        <ConnectWalletButton />
      </div>
    </Container>
  );
};
