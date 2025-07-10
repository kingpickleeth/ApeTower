import { useState, useEffect } from 'react';
import { getProfile, upsertProfile } from '../utils/profile';
import { uploadPfp } from '../utils/storage';

interface Props {
    walletAddress: string;
    onClose: () => void;
    onSave?: () => void; // 👈 new optional callback
  }  
  export default function ProfileEditor({ walletAddress, onClose, onSave }: Props) {

  
  const [username, setUsername] = useState('');
  const [pfpUrl, setPfpUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const profile = await getProfile(walletAddress);
      if (profile) {
        setUsername(profile.username);
        setPfpUrl(profile.pfp_url);
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
    await upsertProfile(walletAddress, username, pfpUrl);
    alert('Profile saved!');
    onSave?.();     // 🔄 Trigger profile refresh in App
    onClose();      // ✅ Close the modal
  };
  if (loading) return <p>Loading profile...</p>;

  return (
    <div id="profile-card">
      <h2>Your Super Sexy Profile Page</h2>
  
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
 
  <label htmlFor="pfpUpload" style={{ marginTop: '3px' }}>Upload Image:</label>
  <input type="file" id="pfpUpload" accept="image/*" onChange={handleFileUpload} />
</div>
      {pfpUrl && (
        <div className="avatar-preview">
          <img src={pfpUrl} alt="pfp" />
          <span>{username || 'Your Username'}</span>
        </div>
      )}
  
      <div className="button-row">
        <button className="save-btn" onClick={saveProfile}>💾 Save</button>
        <button className="close-btn" onClick={onClose}>❌ Close</button>
      </div>
    </div>
  );  
  
}
