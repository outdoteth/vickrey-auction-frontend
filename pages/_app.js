import { BodyLayout } from "../components/layout/BodyLayout";
import { Header } from "../components/layout/Header";
import { EthereumProvider } from "../context/EthereumContext";
import "../styles/globals.css";

function App({ Component, pageProps }) {
  return (
    <EthereumProvider>
      <BodyLayout id="app-root">
        <Header />
        <Component {...pageProps} />
      </BodyLayout>
    </EthereumProvider>
  );
}

export default App;
