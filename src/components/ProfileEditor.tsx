import { useState, useEffect } from 'react';
import { getProfile, upsertProfile } from '../utils/profile';
import { uploadPfp } from '../utils/storage';
import GameModal from './GameModal'; // 👈 Add this at the top
import { updateVineBalance } from '../utils/profile'; // ⬅️ Make sure this exists
import { getProfileByUsername } from '../utils/profile';

const DEFAULT_PFP_URL = 'https://admin.demwitches.xyz/PFP.svg';

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


  const [showErrorModal, setShowErrorModal] = useState<string | null>(null);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);  

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
    if (!username || username.trim().length === 0) {
      setUsernameTaken(false); // Reset when field is empty
      return;
    }
  
    const timeout = setTimeout(async () => {
      setCheckingUsername(true);
      const otherProfile = await getProfileByUsername(username); // 👈 You'll add this helper
      if (otherProfile) {
        if (otherProfile.wallet_address !== walletAddress) {
          setUsernameTaken(true); // Taken by someone else
        } else {
          // It's your own username — neither taken nor available
          setUsernameTaken(false);
        }
      } else {
        setUsernameTaken(false); // Available
      }
      
      setCheckingUsername(false);
    }, 500); // debounce
  
    return () => clearTimeout(timeout);
  }, [username, walletAddress]);
  
  
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
        {pfpUrl && (
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

  <span  style={{
    display: 'block',
    textAlign: 'center',
    fontSize: '24px',
    color: '#fff',
    fontWeight: '600' // ← Add this
  }}
>
    {username || 'Your Username'}
  </span>
    {/* 🌿 VINE Balance + Claim */}
    <div className="vine-balance-row" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      margin: '0'
    }}>
      <div style={{ fontSize: '16px', color: '#5CFFA3' }}>
        🌿 {vineBalance} $VINE
      </div>
      {vineBalance > 0 && (
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
)}

    </div>
  </>
)}

  
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
