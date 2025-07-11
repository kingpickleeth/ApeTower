import './index.css';
import GameCanvas from './components/GameCanvas';
import ProfileEditor from './components/ProfileEditor';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { JsonRpcProvider, Wallet, Contract, parseUnits, getAddress } from 'ethers';
import { getProfile } from './utils/profile';
const VINE_TOKEN = "0xe6027e786e2ef799316afabae84e072ca73aa97f";
const APECHAIN_RPC = "https://apechain.calderachain.xyz/http";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)"
];
function App() {
  const { isConnected, address } = useAccount();
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<{ username: string; pfp_url: string } | null>(null);
  useEffect(() => {
    const handler = async (e: any) => {
      const amount = e.detail.amount;
      if (!address) return alert("Wallet not connected.");
      try {
        const provider = new JsonRpcProvider(APECHAIN_RPC);
        const privateKey = import.meta.env.VITE_VINE_SENDER_KEY;
        if (!privateKey) throw new Error("VINE_SENDER_KEY not set in .env");
        const wallet = new Wallet(privateKey, provider);
        const token = new Contract(VINE_TOKEN, ERC20_ABI, wallet);
        const decimals = await token.decimals();
        const parsedAmount = parseUnits(amount.toString(), decimals);
        const txRequest = await token.getFunction("transfer").populateTransaction(getAddress(String(address)), parsedAmount);
        txRequest.gasLimit = 70_000n;
        txRequest.maxFeePerGas = parseUnits("30", "gwei");
        const sentTx = await wallet.sendTransaction(txRequest);
        await sentTx.wait();
        alert(`✅ Look at you go dawg! Big baller, shot caller. You just claimed ${amount} $VINE!\n\nCheck out the transaction: https://apescan.io/tx/${sentTx.hash}\n\nDon't Spend It All In One Place Now 😉`);
      } catch (err: any) {
        console.error(err);
        alert("🚨 Failed to claim $VINE: " + err.message);
      }
    };
    window.addEventListener("claim-vine", handler);
    return () => window.removeEventListener("claim-vine", handler);
  }, [address]);
  useEffect(() => {
    if (!address) return;
    getProfile(address).then(setProfile);
  }, [address]);
  return (
    <div id="app-container">
      {!isConnected ? (
        <div id="connect-screen">
          <div id="background-visual" />
          <div id="connect-modal">
            <h1>Ape Tower</h1>
            <p>Connect your wallet to enter the jungle.</p>
            <div id="wallet-connect-container"><ConnectButton /></div>
          </div>
        </div>
      ) : (
        <>
          <div id="navbar">
            <div id="navbar-title">Ape Tower</div>
            <div id="spacer" />
            <div id="wallet-button-container">
              <ConnectButton showBalance={false} accountStatus="address" />
              {profile?.pfp_url ? (
                <>
                  <button className="profile-pfp-button" onClick={() => setShowProfile(true)} title={profile?.username || 'Profile'}>
                    <img src={profile.pfp_url} alt="pfp" />
                  </button>
                  <button className="profile-pfp-button-mobile" onClick={() => setShowProfile(true)} title={profile?.username || 'Profile'}>
                    <img src={profile.pfp_url} alt="pfp" />
                  </button>
                </>
              ) : (
                <>
                  <button className="profile-btn" onClick={() => setShowProfile(true)}>👤 Profile</button>
                  <button className="profile-btn-mobile" onClick={() => setShowProfile(true)}>👤</button>
                </>
              )}
            </div>
          </div>

          <div id="game-wrapper">
            <div id="game-content">
              <div id="game-frame"><GameCanvas /></div>
            </div>
          </div>
          {showProfile && (
            <div id="profile-modal">
              <div id="profile-overlay" onClick={() => setShowProfile(false)} />
              <div id="profile-card">
                <ProfileEditor
                  walletAddress={address!}
                  onClose={() => setShowProfile(false)}
                  onSave={async () => {
                    setShowProfile(false);
                    setProfile(await getProfile(address!));
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default App;