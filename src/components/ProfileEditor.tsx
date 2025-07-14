import { useState, useEffect } from 'react';
import { getProfile, upsertProfile } from '../utils/profile';
import { uploadPfp } from '../utils/storage';
import GameModal from './GameModal'; // 👈 Add this at the top
import { updateVineBalance } from '../utils/profile'; // ⬅️ Make sure this exists
import { getProfileByUsername } from '../utils/profile';
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import VINE_ABI from '../abis/VineToken.json'; // create this if needed


const DEFAULT_PFP_URL = 'https://admin.demwitches.xyz/PFP.svg';
const VINE_CONTRACT = '0xe6027e786e2Ef799316aFabAE84E072cA73AA97f';
const FALLBACK_RPC = "https://rpc.apechain.com"; // or your custom node

const retryUntilBalanceUpdates = async (
  walletAddress: string,
  prevBalance: number,
  setWalletVineBalance: (val: number) => void,
  retries = 5,
  delay = 7000
) => {
  const provider = new JsonRpcProvider(FALLBACK_RPC);
  const contract = new Contract(VINE_CONTRACT, VINE_ABI, provider);

  for (let i = 0; i < retries; i++) {
    console.log(`⏳ Retry ${i + 1}/${retries}...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    const raw = await contract.balanceOf(walletAddress);
    const formatted = parseFloat(formatUnits(raw, 18));

    if (formatted !== prevBalance) {
      console.log(`🎉 Wallet balance updated: ${formatted}`);
      setWalletVineBalance(formatted);
      return;
    } else {
      console.log(`🕵️ Still stale (${formatted}), retrying...`);
    }
  }
  console.warn("⚠️ Gave up after retries — balance may still be stale.");
};

interface Props {
  walletAddress: string;
  onClose?: () => void; // ✅ now optional
  onSave?: () => void;
}

  export default function ProfileEditor({ walletAddress, onClose, onSave }: Props) {

  
  const [username, setUsername] = useState('');
  const [pfpUrl, setPfpUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [vineBalance, setVineBalance] = useState<number>(0);
  const [profile, setProfile] = useState<any | null>(null);
  
  const [walletVineBalance, setWalletVineBalance] = useState<number>(0);

  const [showErrorModal, setShowErrorModal] = useState<string | null>(null);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);  
  const [hasEditedUsername, setHasEditedUsername] = useState(false);
  const fetchWalletBalance = async () => {
    if (!window.ethereum || !walletAddress) return;
  
    const provider = new JsonRpcProvider(FALLBACK_RPC);
    const contract = new Contract(VINE_CONTRACT, VINE_ABI, provider);
  
    try {
      const rawBalance = await contract.balanceOf(walletAddress, {
        blockTag: 'latest'
      });
      const formatted = parseFloat(formatUnits(rawBalance, 18));
      console.log("💰 fetched balance:", formatted);

      // 🔁 Force state update even if value doesn't change
      setWalletVineBalance(prev => (formatted !== prev ? formatted : prev + 0.000001));
    } catch (err) {
      console.error('Error fetching wallet VINE:', err);
    }
  };
  
  
  useEffect(() => {
    async function fetch() {
      const profile = await getProfile(walletAddress);
      if (profile) {
        setUsername(profile.username);
        setPfpUrl(profile.pfp_url);
        setBio(profile.bio || '');
        setVineBalance(profile.total_vine || 0);
        setProfile(profile); // ✅ Add this
      }
      setLoading(false);
    }
    fetch();
  }, [walletAddress]);
  useEffect(() => {
    fetchWalletBalance();
  }, [walletAddress]);
  // 🌱 Refetch username availability when edited
useEffect(() => {
  if (!hasEditedUsername || !username.trim()) {
    setUsernameTaken(false);
    return;
  }

  const timeout = setTimeout(async () => {
    setCheckingUsername(true);
    const otherProfile = await getProfileByUsername(username);

    if (otherProfile) {
      if (otherProfile.wallet_address !== walletAddress) {
        setUsernameTaken(true);
      } else {
        setUsernameTaken(false);
      }
    } else {
      setUsernameTaken(false);
    }

    setCheckingUsername(false);
  }, 500);

  return () => clearTimeout(timeout);
}, [username, walletAddress, hasEditedUsername]);

// ✅ Move this into its own top-level useEffect
useEffect(() => {
  const handler = () => {
    console.log("📱 App returned to foreground. Refetching wallet balance...");
    fetchWalletBalance();
  };

  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}, []);

  useEffect(() => {
    const handler = () => {
      fetchWalletBalance(); // 🔁 Refresh onchain balance after tx confirms
    };
  
    window.addEventListener("vine-claimed-onchain", handler);
    return () => window.removeEventListener("vine-claimed-onchain", handler);
  }, []);
  useEffect(() => {
    const onBalanceUpdate = () => {
      console.log("📥 Received vine-wallet-balance-update");
      retryUntilBalanceUpdates(walletAddress, walletVineBalance, setWalletVineBalance);
    };
  
    window.addEventListener("vine-wallet-balance-update", onBalanceUpdate);
    return () => window.removeEventListener("vine-wallet-balance-update", onBalanceUpdate);
  }, [walletVineBalance, walletAddress]);
  
  
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const uploadedUrl = await uploadPfp(walletAddress, file);
    if (uploadedUrl) {
      setPfpUrl(uploadedUrl);
    } else {
      alert('Failed to upload image.');
    }
  };

  const saveProfile = async () => {
    if (!username.trim()) {
      setShowErrorModal("Username is required!");
      return;
    }
    const DEFAULT_PFP_URL = 'https://admin.demwitches.xyz/PFP.svg'; // ✅ Use your actual default image path
const finalPfp = pfpUrl || DEFAULT_PFP_URL;
const { error } = await upsertProfile(walletAddress, username, finalPfp, bio);

  
    if (error) {
      if (error.message.includes('duplicate key value') || error.code === '23505') {
        setShowErrorModal('That username is already taken. Please try another.');
      } else {
        setShowErrorModal('Something went wrong while saving. Try again later.');
      }
      return;
    }
  
    // Dispatch a global event — App.tsx listens to this and shows the success modal
    window.dispatchEvent(new CustomEvent("show-success-modal", {
      detail: { message: "Profile saved successfully!" }
    }));
  
    onSave?.(); // 🔥 Let the parent know we saved — but do NOT close modal here
    console.log('✅ Profile saved, showing modal');
  };
  const handleClaim = async () => {
    if (vineBalance <= 0) return;
  
    // 🌿 Dispatch claim-vine event to App.tsx (handles transaction)
    window.dispatchEvent(new CustomEvent("claim-vine", {
      detail: { amount: vineBalance }
    }));
  
    // 🧼 Reset vine balance in Supabase directly
    const result = await updateVineBalance(walletAddress, -vineBalance); // subtract
  
    if (result?.error) {
      console.error("❌ Failed to reset vine in Supabase:", result.error);
    } else {
      setVineBalance(0); // ✅ Update UI immediately
      console.log("✅ Vine claimed and reset");
     await fetchWalletBalance(); // ✅ This is what updates the wallet UI

    }
  };
  
  if (loading) return <p>Loading profile...</p>;
  return (
    <>
      {showErrorModal && (
        <GameModal
          message="That username is already taken. Please try another."
          type="error"
          onClose={() => setShowErrorModal(null)}
        />
      )}

      <div id="profile-card">
        <h2>Your Super Sexy Profile</h2>

        <>
          {/* 🖼️ Clickable Avatar */}
          <label htmlFor="pfp-upload" className="avatar-upload">
            <img
              src={pfpUrl || DEFAULT_PFP_URL}
              alt="pfp"
              className="avatar-img"
            />
            <input
              id="pfp-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div className="edit-overlay">✏️</div>
          </label>

          <span style={{
            display: 'block',
            textAlign: 'center',
            fontSize: '24px',
            color: '#fff',
            fontWeight: '600'
          }}>
            {username || 'Your Username'}
          </span>

          {/* 🌿 Game Balance + Claim (only if > 0) */}
          {vineBalance > 0 && (
            <div className="vine-balance-row" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              margin: '0'
            }}>
              <div style={{ fontSize: '18px', color: '#5CFFA3' }}>
                Game Balance: {vineBalance} $VINE
              </div>
              <button
                onClick={handleClaim}
                style={{
                  background: '#5CFFA3',
                  color: '#1A1F2B',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Claim
              </button>
            </div>
          )}

          {/* 💼 Wallet Balance (only if > 0) */}
          {walletVineBalance > 0 && (
            <div style={{ fontSize: '18px', color: '#5CFFA3', textAlign: 'center', marginTop: '4px' }}>
              Wallet Balance: {Math.floor(walletVineBalance)} $VINE
            </div>
          )}
        </>

        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setHasEditedUsername(true);
            }}
            placeholder="Enter your name"
          />
          {!username.trim() ? (
            <div style={{ color: '#1A1F2B', marginTop: '4px' }}>
              Username is required.
            </div>
          ) : checkingUsername ? (
            <div style={{ color: '#3CDFFF', marginTop: '4px' }}>
              Checking availability...
            </div>
          ) : usernameTaken ? (
            <div style={{ color: '#1A1F2B', marginTop: '4px' }}>
              That username is already taken.
            </div>
          ) : profile?.username === username.trim() ? null : (
            <div style={{ color: '#00B3FF', marginTop: '4px' }}>
              ✅ That username is available!
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="bio">Bio:</label>
          <textarea
            id="bio"
            className="styled-input"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 100))}
            placeholder="Write something cool (max 100 characters)"
            rows={3}
          />
          <small style={{ color: '#DFFBFF' }}>{bio.length}/100 characters</small>
        </div>

        <div className="button-row">
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              ❌ Close
            </button>
          )}
          <button className="save-btn" onClick={saveProfile}>
            💾 Save
          </button>
        </div>
      </div>
    </>
  );

}
