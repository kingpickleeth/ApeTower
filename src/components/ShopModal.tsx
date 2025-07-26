import React, { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { parseEther } from 'viem';
import { buyMoo } from '../utils/buyMoo';
import { useTowerContract } from '../utils/contracts';

interface Props {
  walletAddress: string;
  onClose: () => void;
}

export default function ShopModal({ walletAddress, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'towers' | 'moo'>('towers');

  const towerItems = [
    {
      type: 'Basic',
      image: 'https://admin.demwitches.xyz/images/tower/basic.png',
      cost: '50 $MOO',
      description: 'Reliable and balanced starter tower.',
      stats: { speed: 3, range: 4, damage: 3 }
    },
    {
      type: 'Rapid',
      image: 'https://admin.demwitches.xyz/images/tower/rapid.png',
      cost: '100 $MOO',
      description: 'High speed, lower damage.',
      stats: { speed: 5, range: 3, damage: 2 }
    },
    {
      type: 'Cannon',
      image: 'https://admin.demwitches.xyz/images/tower/cannon.png',
      cost: '200 $MOO',
      description: 'Massive damage, slow fire rate.',
      stats: { speed: 1, range: 4, damage: 5 }
    }
  ];

  const mooBundles = [
    { amount: 50, cost: '0.25 $APE', image: 'https://admin.demwitches.xyz/images/VineBundle.png' },
    { amount: 100, cost: '0.5 $APE', image: 'https://admin.demwitches.xyz/images/VineBundle.png' },
    { amount: 200, cost: '1 $APE', image: 'https://admin.demwitches.xyz/images/VineBundle.png' }
  ];
  const { data: walletClient } = useWalletClient();
  const towerContract = useTowerContract(); // ✅ SAFE hook call
  

  const handleBuyMoo = async (amountEth: string) => {
    if (!walletClient) return alert('Connect your wallet');
  
    const amountInWei = parseEther(amountEth);
    try {
      const tx = await buyMoo({ walletClient, amount: amountInWei });
      console.log('MOO purchase TX:', tx);
      alert('Purchase submitted!');
    } catch (err) {
      console.error(err);
      alert('Transaction failed');
    }
  };  
  const handleBuyTower = async (towerType: number) => {
    if (!walletClient || !towerContract) return alert('Wallet or contract not ready');
  
    try {
      const tx = await towerContract.write.buyTower([towerType]);
      console.log('Tower mint TX:', tx);
      alert('Tower purchase submitted!');
    } catch (err) {
      console.error(err);
      alert('Tower transaction failed');
    }
  };
  
  return (
    <div id="profile-modal" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div id="profile-overlay" onClick={onClose} />
      <div
        id="profile-card"
        style={{
          width: '90%',
          maxWidth: '900px',
          padding: '20px',
          background: '#0D1117',
          borderRadius: '16px',
          boxShadow: '0 0 24px rgba(0,179,255,0.1)',
          border: '2px solid #00B3FF',
          color: '#fff'
        }}
      >
        <h2
          style={{
            fontSize: '2.2rem',
            color: '#00B3FF',
            textShadow: '0 0 2px #00B3FF, 0 0 4px #00B3FF',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '12px'
          }}
        >
          The Shop
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
  <button
    className={`glow-button tab ${activeTab === 'towers' ? 'active' : ''}`}
    onClick={() => setActiveTab('towers')}
  >
    🧱 Buy Towers
  </button>
  <button
    className={`glow-button tab ${activeTab === 'moo' ? 'active' : ''}`}
    onClick={() => setActiveTab('moo')}
  >
    🍃 Buy $MOO
  </button>
</div>

        {/* Tab Content */}
        {activeTab === 'towers' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}
          >
            {towerItems.map((tower, i) => (
              <div
                key={i}
                style={{
                  background: '#1A1F2B',
                  border: '1px solid #3CDFFF',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                  color: '#D0EFFF'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: '#6daed4',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                 <img
  src={tower.image}
  alt={tower.type}
  style={{
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    objectFit: 'contain'
  }}
/>
</div>
<h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: '#00B3FF' }}>
  {tower.type} Tower
</h3>
<p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>{tower.description}</p>
                <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                  🔹 <strong>Speed:</strong> {tower.stats.speed} <br />
                  🔹 <strong>Range:</strong> {tower.stats.range} <br />
                  🔹 <strong>Damage:</strong> {tower.stats.damage}
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#5CFFA3' }}>Cost: {tower.cost}</div>
                <button className="glow-button green" onClick={() => handleBuyTower(i)}>
  Buy / Mint
</button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}
          >
            {mooBundles.map((bundle, i) => (
              <div
                key={i}
                style={{
                  background: '#1A1F2B',
                  border: '1px solid #3CDFFF',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                  color: '#D0EFFF'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: '#262f3a',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                 <img
  src={bundle.image}
  alt={`${bundle.amount} moo`}
  style={{
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    objectFit: 'contain'
  }}
/>
</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: '#00B3FF' }}>{bundle.amount} $MOO</h3>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#5CFFA3' }}>{bundle.cost}</div>
                <button
  className="glow-button green"
  onClick={() => handleBuyMoo(bundle.cost.split(' ')[0])} // only extract the number
>
  Buy
</button>
              </div>
            ))}
          </div>
        )}

        <div className="button-row" style={{ marginTop: '20px' }}>
        <button className="glow-button danger" onClick={onClose}>
  ❌ Close
</button>
        </div>
      </div>
    </div>
  );
}
