import './index.css';
import GameCanvas from './components/GameCanvas';
import ProfileEditor from './components/ProfileEditor';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { JsonRpcProvider, Wallet, Contract, parseUnits, getAddress } from 'ethers';
import { getProfile } from './utils/profile';
import GameModal from './components/GameModal';
import { updateVineBalance } from './utils/profile'; // ✅ Make sure this is at the top
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
      } catch (err) {
        console.error('🔥 Error in save-vine handler:', err);
      }
    };
  
    window.addEventListener('save-vine', handleSaveVine);
    return () => window.removeEventListener('save-vine', handleSaveVine);
  }, [address]);
  
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
          <div id="navbar">
            <div id="navbar-title">Deng Defense</div>
            <div id="spacer" />
            <div id="wallet-button-container">
              <ConnectButton showBalance={false} accountStatus="address" />
              {isConnected && (
  profile?.pfp_url ? (
    <>
       <button
      className="profile-pfp-button"
      onClick={() => {
        setShowProfile(true);
        if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
        if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput(); // ✅ added
      }}
      title={profile?.username || 'Profile'}
    >
      <img src={profile.pfp_url} alt="pfp" />
    </button>
    <button
      className="profile-pfp-button-mobile"
      onClick={() => {
        setShowProfile(true);
        if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
        if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput(); // ✅ added
      }}
      title={profile?.username || 'Profile'}
    >
      <img src={profile.pfp_url} alt="pfp" />
    </button>
    </>
  ) : (
    <>
     <button
      className="profile-btn"
      onClick={() => {
        setShowProfile(true);
        if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
        if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput(); // ✅ added
      }}
    >
      👤 Profile
    </button>
    <button
      className="profile-btn-mobile"
      onClick={() => {
        setShowProfile(true);
        if ((window as any).pauseGameFromUI) (window as any).pauseGameFromUI();
        if ((window as any).disableMainMenuInput) (window as any).disableMainMenuInput(); // ✅ added
      }}
    >
      👤
    </button></>
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
    }}    
  />
)}

    </div>
  );
}
export default App;