import './index.css';
import GameCanvas from './components/GameCanvas';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

function App() {
  const { isConnected } = useAccount();

  return (
    <div id="app-container">
      {!isConnected && (
        <div id="connect-screen">
          <div id="background-visual" />
          <div id="connect-modal">
            <h1>🧠 Ape Tower</h1>
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
            <div id="navbar-title">🧠 Ape Tower</div>
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
