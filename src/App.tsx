import './index.css';
import GameCanvas from './components/GameCanvas';
import ProfileEditor from './components/ProfileEditor';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { JsonRpcProvider, Wallet, Contract, parseUnits, getAddress } from 'ethers';
import { getProfile } from './utils/profile';
import GameModal from './components/GameModal';
import { updateVineBalance, upgradeCampaignLevel } from './utils/profile'; // ✅ Make sure this is at the top
import DENG_TOWER_ABI from './abis/Tower.json'; // You can paste ABI inline if needed
import React from 'react';
import MyTowersModal from './components/MyTowersModal';
import InteractiveParticles from './components/InteractiveParticles';


const VINE_TOKEN = "0xe6027e786e2ef799316afabae84e072ca73aa97f";
const APECHAIN_RPC = "https://apechain.calderachain.xyz/http";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)"
];
function App() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [showProfile, setShowProfile] = useState(false);
  const [showTowers, setShowTowers] = useState(false);
  const [profile, setProfile] = useState<{ username: string; pfp_url: string } | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [bypassWallet, setBypassWallet] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [mustCompleteProfile, setMustCompleteProfile] = useState(false);

  useEffect(() => {
    const secretCode = [
      'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
      'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
      'b','a'
    ];
    let inputBuffer: string[] = [];
  
    const handleKeyDown = (e: KeyboardEvent) => {
      inputBuffer.push(e.key);
      if (inputBuffer.length > secretCode.length) {
        inputBuffer.shift(); // Maintain fixed buffer size
      }
      if (inputBuffer.join(',') === secretCode.join(',')) {
        console.log("🕹️ Konami Code activated! Bypassing wallet...");
        setBypassWallet(true);
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  useEffect(() => {
    const handler = async (e: any) => {
      const amount = e.detail.amount;
      if (!address) {
        setModalMessage("Wallet not connected.");
        setModalType('error');
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
        const txRequest = await token.getFunction("transfer").populateTransaction(getAddress(String(address)), parsedAmount);
        txRequest.gasLimit = 70_000n;
        txRequest.maxFeePerGas = parseUnits("30", "gwei");
        const sentTx = await wallet.sendTransaction(txRequest);
await sentTx.wait();
setTimeout(() => {
  window.dispatchEvent(new Event("vine-wallet-balance-update"));
}, 4000); // wait 3s after mining before querying balance
window.dispatchEvent(new Event("vine-wallet-balance-update"));

        // ✅ Dispatch wallet update event after tx confirmation
window.dispatchEvent(new CustomEvent("vine-claimed-onchain"));

        setModalMessage(
          `Nice work Big Dawg!You just claimed ${amount} $VINE!<br /><a href="https://apescan.io/tx/${sentTx.hash}" target="_blank" style="color:#2ecc71;text-decoration:underline;">View on ApeScan</a><br /><br />Don't spend it all in one place 😉`
        );        
        setModalType('success');
} catch (err: any) {
        console.error(err);
        setModalMessage("Failed to claim $VINE: " + err.message);
        setModalType('error');        
      }
    };
    window.addEventListener("claim-vine", handler);
    return () => window.removeEventListener("claim-vine", handler);
  }, [address]);
  useEffect(() => {
    const handler = (e: any) => {
      setModalMessage(e.detail.message);
      setModalType('success');
    };
    window.addEventListener("show-success-modal", handler);
    return () => window.removeEventListener("show-success-modal", handler);
  }, []);
  useEffect(() => {
    const handleSaveVine = async (e: any) => {
      const amount = e.detail.amount;
      if (!address) {
        console.warn('⚠️ Cannot save vine — no connected wallet');
        return;
      }
    
      try {
        console.log(`💾 Triggered vine save: ${amount} for ${address}`);
        const result = await updateVineBalance(address, amount);
        if (result?.error) {
          console.error('❌ Failed to update vine balance:', result.error);
        }
    
        // 🎯 Upgrade campaign level to 2 if needed
        const levelResult = await upgradeCampaignLevel(address, 2);
        if (levelResult?.error) {
          console.error('❌ Failed to update campaign level:', levelResult.error);
        }
      } catch (err) {
        console.error('🔥 Error in save-vine handler:', err);
      }
    };
    
  
    window.addEventListener('save-vine', handleSaveVine);
    return () => window.removeEventListener('save-vine', handleSaveVine);
  }, [address]);
  
  useEffect(() => {
    const handler = async (e: any) => {
      const walletAddress = e.detail.wallet;
      if (!walletAddress) return;
  
      try {
        const provider = new JsonRpcProvider(APECHAIN_RPC);
        const privateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
        if (!privateKey) throw new Error("Missing admin private key");
  
        const adminWallet = new Wallet(privateKey, provider);
        const towerContract = new Contract(
          '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec',
          DENG_TOWER_ABI.abi,
          adminWallet
        );
  
        const tx = await towerContract.mintStarterTowers(walletAddress);
        const receipt = await tx.wait();
        const tokenIds: number[] = [];

for (const log of receipt.logs) {
  try {
    if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
      // Standard ERC721 Transfer event
      const tokenIdHex = log.topics[3]; // topics[3] = tokenId (indexed)
      const tokenId = parseInt(tokenIdHex, 16);
      tokenIds.push(tokenId);
    }
  } catch (err) {
    console.warn('Error parsing log:', err);
  }
}

console.log("🎯 Minted token IDs:", tokenIds);

for (const id of tokenIds) {
  try {
    const res = await fetch(`https://metadata-server-production.up.railway.app/generate-metadata/${id}`, {
      method: 'POST',
      headers: {
        'x-metadata-secret': import.meta.env.VITE_METADATA_SECRET!
      }
    });
    
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server returned ${res.status}: ${text}`);
    }
    console.log(`📁 Metadata generated for tower #${id}`);
  } catch (err) {
    console.error(`❌ Metadata generation failed for ID ${id}:`, err);
  }
}



        console.log("✅ Towers minted:", receipt.transactionHash);
  
        window.dispatchEvent(new CustomEvent("towers-minted", {
          detail: { txHash: receipt.transactionHash }
        }));
      } catch (err) {
        console.error("❌ Failed to mint towers:", err);
      }
    };
  
    window.addEventListener("mint-starter-towers", handler);
    return () => window.removeEventListener("mint-starter-towers", handler);
  }, []);
  
  useEffect(() => {
    if (!address) return;
    getProfile(address).then((profileData) => {
      setProfile(profileData);
      if (!profileData?.username) {
        setMustCompleteProfile(true); // 🛑 Force profile editor
        setShowProfile(true);
      }
    });
  }, [address]);
  
  
  return (
    <div id="app-container">
      {!isConnected && !bypassWallet ? (
        <div id="connect-screen">
          <div id="background-visual" />
          <div id="connect-modal">
            <h1>Deng Defense</h1>
            <p>Connect your wallet to enter the jungle.</p>
            <div id="wallet-connect-container"><ConnectButton /></div>
          </div>
        </div>
      ) : (
        <>
        <InteractiveParticles />
          <div id="navbar">
      
<div id="navbar-title">Deng Defense</div>
            <div id="spacer" />
            <div id="wallet-button-container">
            {!isConnected && <ConnectButton showBalance={false} accountStatus="address" />}

              {isConnected && (
  profile?.pfp_url ? (
    <>
    <button
    className="my-towers-button"
    onClick={() => {
      setShowTowers(true);
      if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
      if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput();
      if ((window as any).disableCampaignInput) (window as any).disableCampaignInput();
      if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput();
    }}
  >
  My Towers
  </button>
  <button
  className="my-towers-button profile-with-pfp"
  onClick={() => {
    setShowProfile(true);
    if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
    if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput();
    if ((window as any).disableCampaignInput) (window as any).disableCampaignInput();
    if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput();
  }}
  title={profile?.username || 'Profile'}
>
  Profile
  <img src={profile.pfp_url} alt="pfp" className="pfp-inline" />
</button>
<div className="tooltip-container">
  <button
    className="my-towers-button logout-button"
    onClick={() => disconnect()}
    onMouseEnter={() => {
      const tooltip = document.getElementById('logout-tooltip');
      if (tooltip) tooltip.style.opacity = '1';
    }}
    onMouseLeave={() => {
      const tooltip = document.getElementById('logout-tooltip');
      if (tooltip) tooltip.style.opacity = '0';
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  </button>
  <div id="logout-tooltip" className="tooltip-text">Are you sure you want to log out?</div>
</div>

    
    </>
  ) : (
    <>
    
     <button
      className="profile-btn"
      onClick={() => {
        setShowProfile(true);
        if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
        if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput(); // ✅ added
        if ((window as any).disableCampaignInput) (window as any).disableCampaignInput(); // ✅ added
        if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput(); // ✅ added
      }}
    >
      👤 Profile
    </button>
    
   </>
  )
)}
            </div>
          </div>

          <div id="game-wrapper">
            <div id="game-content">
            <div id="game-scaler">
            <div id="game-frame">{(isConnected || bypassWallet) && <GameCanvas walletAddress={address ?? ''} />
          }</div>
            </div></div>
          </div>
          {showProfile && (
            <div id="profile-modal">
           <div
  id="profile-overlay"
  onClick={() => {
    if (!mustCompleteProfile) {
      setShowProfile(false);
      if ((window as any).resumeGameFromUI) (window as any).resumeGameFromUI();
      if ((window as any).enableMainMenuInput) (window as any).enableMainMenuInput(); // ✅ restore input
      if ((window as any).enableCampaignInput) (window as any).enableCampaignInput(); // ✅ restore input
      if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput(); // ✅ added
    }
  }}
/>

<div id="profile-card">
<ProfileEditor
  walletAddress={address!}
  onClose={() => {
    if (!mustCompleteProfile) {
      setShowProfile(false);
      if ((window as any).resumeGameFromUI) (window as any).resumeGameFromUI();
      if ((window as any).enableMainMenuInput) (window as any).enableMainMenuInput(); // ✅ restore input
      if ((window as any).enableCampaignInput) (window as any).enableCampaignInput(); // ✅ restore input
      if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput(); // ✅ added
    }
  }}
  
  onSave={async () => {
    setProfile(await getProfile(address!));
    setShowProfile(false); // ✅ Hide profile modal immediately after save
    setProfileSaved(true); // 🟢 Resume game later after success modal OK
    setMustCompleteProfile(false); // ✅ User is good to go now
  }}
/>

              </div>
            </div>
          )}
          {showTowers && (
  <MyTowersModal
    walletAddress={address!}
    onClose={() => {
      setShowTowers(false);
      if ((window as any).resumeGameFromUI) (window as any).resumeGameFromUI();
      if ((window as any).enableMainMenuInput) (window as any).enableMainMenuInput();
      if ((window as any).enableCampaignInput) (window as any).enableCampaignInput();
      if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput();
    }}
  />
)}

        </>
      )}
     {modalMessage && (
  <GameModal
    message={modalMessage}
    type={modalType}
    onClose={() => {
      setModalMessage(null);
      if (profileSaved) {
        setShowProfile(false);      // ✅ finally hide the profile modal
        setProfileSaved(false);     // 🔁 reset flag
      }
      if ((window as any).resumeGameFromUI) (window as any).resumeGameFromUI();
      if ((window as any).enableMainMenuInput) (window as any).enableMainMenuInput(); // ✅ restore input
      if ((window as any).enableCampaignInput) (window as any).enableCampaignInput(); // ✅ restore input
      if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput(); // ✅ added
    }}    
  />
)}

    </div>
  );
}
export default App;