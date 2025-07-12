import { useState, useEffect } from 'react';
import { getProfile, upsertProfile } from '../utils/profile';
import { uploadPfp } from '../utils/storage';
import GameModal from './GameModal'; // 👈 Add this at the top
import { updateVineBalance } from '../utils/profile'; // ⬅️ Make sure this exists


interface Props {
    walletAddress: string;
    onClose: () => void;
    onSave?: () => void; // 👈 new optional callback
  }  
  export default function ProfileEditor({ walletAddress, onClose, onSave }: Props) {

  
  const [username, setUsername] = useState('');
  const [pfpUrl, setPfpUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [vineBalance, setVineBalance] = useState<number>(0);


  const [showErrorModal, setShowErrorModal] = useState<string | null>(null);


  useEffect(() => {
    async function fetch() {
      const profile = await getProfile(walletAddress);
      if (profile) {
        setUsername(profile.username);
        setPfpUrl(profile.pfp_url);
        setBio(profile.bio || '');
        setVineBalance(profile.total_vine || 0);
      }
      setLoading(false);
    }
    fetch();
  }, [walletAddress]);
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
    const { error } = await upsertProfile(walletAddress, username, pfpUrl, bio);
  
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
    const result = await updateVineBalance(walletAddress, 0);
  
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
    <div className="avatar-preview">
      <img src={pfpUrl} alt="pfp" />
      <span>{username || 'Your Username'}</span>
    </div>

    {/* 🌿 VINE Balance + Claim */}
    <div className="vine-balance-row" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      margin: '10px 0'
    }}>
      <div style={{ fontSize: '16px', color: '#2aff84' }}>
        🌿 {vineBalance} $VINE
      </div>
      <button
        onClick={handleClaim}
        style={{
          background: '#2aff84',
          color: '#000',
          padding: '6px 12px',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Claim
      </button>
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
          <small style={{ color: '#ccc' }}>{bio.length}/100 characters</small>
        </div>
  
        <div className="form-group">
          <label htmlFor="pfpUpload" style={{ marginTop: '3px' }}>
            Upload Your PFP:
          </label>
          <input type="file" id="pfpUpload" accept="image/*" onChange={handleFileUpload} />
        </div>
        <div className="button-row">
          <button className="save-btn" onClick={saveProfile}>
            💾 Save
          </button>
          <button className="close-btn" onClick={onClose}>
            ❌ Close
          </button>
        </div>
      </div>
    </>
  );  
}
