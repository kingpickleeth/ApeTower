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
  const [bio, setBio] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetch() {
      const profile = await getProfile(walletAddress);
      if (profile) {
        setUsername(profile.username);
        setPfpUrl(profile.pfp_url);
        setBio(profile.bio || '');
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
    setErrorMsg(''); // clear previous errors
  
    const { error } = await upsertProfile(walletAddress, username, pfpUrl, bio);
  
    if (error) {
      if (error.message.includes('duplicate key value') || error.code === '23505') {
        setErrorMsg('That username is already taken. Please try another.');
      } else {
        setErrorMsg('Something went wrong while saving. Try again later.');
      }
      return;
    }
    alert('Profile saved!');
    onSave?.();
    onClose();
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
      {errorMsg && <p style={{ color: '#ff4d4f', fontWeight: 'bold', marginTop: '6px' }}>{errorMsg}</p>}
      <div className="form-group">
  <label htmlFor="bio">Bio:</label>
  <textarea
  id="bio"
  className="styled-input" // 👈 match your input class
  value={bio}
  onChange={(e) => setBio(e.target.value.slice(0, 100))}
  placeholder="Write something cool (max 100 characters)"
  rows={3}
/>
  <small style={{ color: '#ccc' }}>{bio.length}/100 characters</small>
</div>

      <div className="form-group">
 
  <label htmlFor="pfpUpload" style={{ marginTop: '3px' }}>Upload Your PFP:</label>
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
