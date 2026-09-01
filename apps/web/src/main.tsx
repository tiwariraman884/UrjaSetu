import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WalletManager, WalletProvider } from "@txnlab/use-wallet-react";
import { pera } from "@txnlab/use-wallet-pera";

import App from "./App";
import "./index.css";

// Algorand Testnet wallet manager. Pera Wallet is registered via its official
// @txnlab/use-wallet-pera adapter. No private keys ever live in the browser —
// the connected wallet signs x402 payment transactions.
const manager = new WalletManager({
  wallets: [pera()],
  defaultNetwork: "testnet",
  options: { persistNetwork: false },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider manager={manager}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletProvider>
  </StrictMode>
);


