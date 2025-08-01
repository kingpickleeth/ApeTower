import './index.css';
import GameCanvas from './components/GameCanvas';
import ProfileEditor from './components/ProfileEditor';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect,useSignMessage} from 'wagmi';
import { useEffect, useState } from 'react';
import { JsonRpcProvider, Wallet, Contract, parseUnits, getAddress } from 'ethers';
import { getProfile } from './utils/profile';
import GameModal from './components/GameModal';
import DENG_TOWER_ABI from './abis/Tower.json'; // You can paste ABI inline if needed
import { getOwnedTowersWithMetadata } from './utils/getTowerData';
import MyTowersModal from './components/MyTowersModal';
import ShopModal from './components/ShopModal';
import InteractiveParticles from './components/InteractiveParticles';
import MusicWidget from './components/MusicWidget';
import DengPopup from './components/DengPopup';
import LeaderboardModal from './components/LeaderBoardModal'; // ✅ adjust path if needed

const DENG_CONTRACT = '0x2cf92fe634909a9cf5e41291f54e5784d234cf8d';
const DENG_ABI = ['function balanceOf(address) view returns (uint256)'];

type TowerNFT = {
  id: number;
  type: 'basic' | 'rapid' | 'cannon';
  level: number;
  damage: number;
  range: number;
  speed: number;
  imageUrl: string;
  used?: boolean;
  fireRate?:number;
};


const VINE_TOKEN = "0xe6027e786e2ef799316afabae84e072ca73aa97f";
const APECHAIN_RPC = "https://apechain.calderachain.xyz/http";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)"
];
function App() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [towerNFTs, setTowerNFTs] = useState([]);
  const [ownedTowerNFTs, setOwnedTowerNFTs] = useState<TowerNFT[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTowers, setShowTowers] = useState(false);
  const [profile, setProfile] = useState<{ username: string; pfp_url: string } | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [bypassWallet, setBypassWallet] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [mustCompleteProfile, setMustCompleteProfile] = useState(false);
  const [towersLoaded, setTowersLoaded] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [hasDeng, setHasDeng] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

useEffect(() => {
  const checkDengOwnership = async () => {
    if (!address) return setHasDeng(false);

    try {
      const provider = new JsonRpcProvider(APECHAIN_RPC);
      const dengContract = new Contract(DENG_CONTRACT, DENG_ABI, provider);
      const balance = await dengContract.balanceOf(address);
      setHasDeng(Number(balance) > 0);
    } catch (err) {
      console.error("❌ Error checking Deng ownership:", err);
      setHasDeng(false);
    }
  };

  checkDengOwnership();
}, [address]);

  useEffect(() => {
    const handler = async () => {
      console.log('🎯 request-refresh-towers handler triggered in App.tsx');
      if (!address) return;
      console.log('🔁 Refreshing tower metadata from MainMenu...');
      const updated = await getOwnedTowersWithMetadata(address);
      setOwnedTowerNFTs(updated);
      setGameKey((k) => k + 1); // 🧹 Force GameCanvas remount
    };
  
    window.addEventListener('request-refresh-towers', handler);
    return () => window.removeEventListener('request-refresh-towers', handler);
  }, [address]);
  
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
  const handler = (e: any) => {
    const message = e?.detail?.message || 'Your free towers have been minted!';
    setModalMessage(message);
    setModalType('success');
    window.dispatchEvent(new Event("refresh-towers-after-modal"));
  };

  window.addEventListener("show-success-modal", handler);
  return () => window.removeEventListener("show-success-modal", handler);
}, []);
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
const towerTypes = [0, 1, 2]; // Minted in order: Basic, Cannon, Rapid

for (let i = 0; i < tokenIds.length; i++) {
  const id = tokenIds[i];
  const type = towerTypes[i];

  try {
    const res = await fetch(`https://metadata-server-production.up.railway.app/generate-metadata/${id}`, {
      method: 'POST',
      headers: {
        'x-metadata-secret': import.meta.env.VITE_METADATA_SECRET!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server returned ${res.status}: ${text}`);
    }
    console.log(`📁 Metadata generated for tower #${id} (type ${type})`);
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
  
  useEffect(() => {
    const handleUpgradeMetadata = async (e: any) => {
      const { tokenId, type, level } = e.detail;
      if (!tokenId || type === undefined || !level) {
        console.warn('❌ Missing metadata upgrade fields');
        return;
      }
  
      try {
        console.log("📡 Sending metadata request...");
        const res = await fetch(`https://metadata-server-production.up.railway.app/generate-metadata/${tokenId}`, {
          method: 'POST',
          headers: {
            'x-metadata-secret': import.meta.env.VITE_METADATA_SECRET!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type, level })
        });
        console.log("✅ Got response:", res.status);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server responded ${res.status}: ${text}`);
        }
  
        console.log(`✅ Metadata updated for tower #${tokenId} (Lv ${level})`);
      } catch (err) {
        console.error(`❌ Metadata upgrade failed for tower #${tokenId}:`, err);
      }
    };
  
    window.addEventListener("upgrade-tower-metadata", handleUpgradeMetadata);
    return () => window.removeEventListener("upgrade-tower-metadata", handleUpgradeMetadata);
  }, []);
  useEffect(() => {
    const fetchTowers = async () => {
      if (!address) return;
      const towers = await getOwnedTowersWithMetadata(address);
      setOwnedTowerNFTs(towers);
      setTowersLoaded(true); // ✅ signal that we’re done loading
      console.log('🧠 Loaded towers:', towers);
    };
  
    fetchTowers();
  }, [address]);
  const { signMessageAsync } = useSignMessage();
  useEffect(() => {
    const handlePublishRequest = async (e: any) => {
      const data = e.detail;
      try {
        const message = `DENG_DEFENSE_GAME_RESULTS:${data.wallet}:${data.gameId}:${data.mooEarned}:${data.levelBeat}:${data.wavesSurvived}:${data.enemiesKilled}:${data.livesRemaining}:${data.sessionToken}`;
  
        console.log('🖊️ Signing game result with:', message);
  
        const publishsignature = await signMessageAsync({ message });
  
        if (!publishsignature || publishsignature.length !== 132 || !publishsignature.startsWith("0x")) {
          throw new Error("Signature looks invalid or malformed");
        }
  
        const res = await fetch('https://metadata-server-production.up.railway.app/api/publish-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, message, publishsignature }),
        });
  
        const result = await res.json();
        console.log('📡 Game results published:', result);
  
      } catch (error) {
        console.error('❌ Failed to publish game results', error);
      }
    };
  
    window.addEventListener('request-publish-game-results', handlePublishRequest);
    return () => window.removeEventListener('request-publish-game-results', handlePublishRequest);
  }, [signMessageAsync]);  
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
      className="my-towers-button leaderboard-button"
      onClick={() => {
        setShowLeaderboard(true);
        if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
      }}
    >
      🏆 Leaderboard
    </button>
    <button
  className="my-towers-button"
  onClick={() => {
    setShowShop(true);
    if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
    if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput();
    if ((window as any).disableCampaignInput) (window as any).disableCampaignInput();
    if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput();
  }}
>
 The Shop
</button>
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
    <div id="game-frame">
    {(isConnected || bypassWallet) && towersLoaded && (
  <GameCanvas
  key={gameKey}
  walletAddress={address ?? ''}
  towerNFTs={ownedTowerNFTs}
/>
)}
    </div>
  </div>
</div>

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
{showShop && (
  <ShopModal
    walletAddress={address || ''}
    onClose={() => {
      setShowShop(false);
      if ((window as any).resumeGameFromUI) (window as any).resumeGameFromUI();
      if ((window as any).enableMainMenuInput) (window as any).enableMainMenuInput();
      if ((window as any).enableCampaignInput) (window as any).enableCampaignInput();
      if ((window as any).disableMainSceneInput) (window as any).disableMainSceneInput();
    }}
  />
)}
{showLeaderboard && (
  <LeaderboardModal
    onClose={() => {
      setShowLeaderboard(false);
      if ((window as any).resumeGameFromUI) (window as any).resumeGameFromUI();
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
<DengPopup walletHasDeng={hasDeng} />
<MusicWidget />
    </div>
  );
}
export default App;