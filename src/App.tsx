import './index.css';
import GameCanvas from './components/GameCanvas';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { JsonRpcProvider } from 'ethers';
import { Wallet, Contract, parseUnits } from 'ethers';
import { getAddress } from 'ethers'; // 👈 Add to your import if not already




const VINE_TOKEN = "0xe6027e786e2ef799316afabae84e072ca73aa97f"; // 👈 Replace with real contract address
const APECHAIN_RPC = "https://apechain.calderachain.xyz/http";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)"
];

function App() {
  const { isConnected, address } = useAccount();

  useEffect(() => {
    const handler = async (e: any) => {
      const amount = e.detail.amount;

      if (!address) {
        alert("Wallet not connected.");
        return;
      }

      try {
        const provider = new JsonRpcProvider(APECHAIN_RPC);
        const privateKey = import.meta.env.VITE_VINE_SENDER_KEY;
if (!privateKey) throw new Error("VINE_SENDER_KEY not set in .env");
const wallet = new Wallet(privateKey, provider);

        const token = new Contract(VINE_TOKEN, ERC20_ABI, wallet);
        
        const decimals = await token.decimals();
        const parsedAmount = parseUnits(amount.toString(), decimals);
        
        const transferFn = token.getFunction("transfer");
        const txRequest = await transferFn.populateTransaction(getAddress(String(address)), parsedAmount);
        
        const sentTx = await wallet.sendTransaction(txRequest);
        await sentTx.wait();        
        
        alert(`✅ Claimed ${amount} $VINE! Tx: ${sentTx.hash}`);
      } catch (err: any) {
        console.error(err);
        alert("🚨 Failed to claim $VINE: " + err.message);
      }
    };

    window.addEventListener("claim-vine", handler);
    return () => window.removeEventListener("claim-vine", handler);
  }, [address]);


  return (
    <div id="app-container">
      {!isConnected && (
        <div id="connect-screen">
          <div id="background-visual" />
          <div id="connect-modal">
            <h1>Ape Tower</h1>
            <p>Connect your wallet to enter the jungle.</p>
            <div id="wallet-connect-container">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}

      {isConnected && (
        <>
          {/* 🧠 Top Navbar */}
          <div id="navbar">
            <div id="navbar-title">Ape Tower</div>
            <div id="wallet-button-container">
              <ConnectButton showBalance={false} accountStatus="address" />
            </div>
          </div>

          {/* 🎮 Game Content */}
          <div id="game-wrapper">
            <div id="game-content">
              <div id="game-frame">
                <GameCanvas />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
