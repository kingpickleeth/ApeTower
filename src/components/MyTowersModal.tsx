import { useEffect, useState } from 'react';
import { JsonRpcProvider, Contract } from 'ethers';
import DENG_TOWER_ABI from '../abis/Tower.json';
import { useWriteContract, useAccount } from 'wagmi';
import { parseEther } from 'viem'; // or parseUnits if using bigint
import { useUpgradeTower } from '../utils/upgradeTower'; // ✅ Confirm path


const TOWER_CONTRACT = '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec';
const RPC = 'https://rpc.apechain.com';
interface Props {
  walletAddress: string;
  onClose: () => void;
}
interface Tower {
  id: number;
  image: string;
  type: string;
  level: number;
  speed?: number;
  range?: number;
  damage?: number;
}
export default function MyTowersModal({ walletAddress, onClose }: Props) {
  const [towers, setTowers] = useState<Tower[]>([]);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const { upgradeTower } = useUpgradeTower();
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchTowers = async () => {
      try {
        const provider = new JsonRpcProvider(RPC);
        const contract = new Contract(TOWER_CONTRACT, DENG_TOWER_ABI.abi, provider);
        const ids: number[] = await contract.getOwnedTowers(walletAddress);
        const towersWithMetadata: Tower[] = await Promise.all(
          ids.map(async (id) => {
            const metaUrl = `https://metadata-server-production.up.railway.app/api/tower/${id}.json`;
            try {
              const res = await fetch(metaUrl);
              if (!res.ok) throw new Error('Failed to fetch metadata');
              const data = await res.json();
              const type = data.attributes?.find((a: any) => a.trait_type === 'Type')?.value || 'Unknown';
              const level = data.attributes?.find((a: any) => a.trait_type === 'Level')?.value || 1;
              const speed = data.attributes?.find((a: any) => a.trait_type === 'Speed')?.value;
              const range = data.attributes?.find((a: any) => a.trait_type === 'Range')?.value;
              const damage = data.attributes?.find((a: any) => a.trait_type === 'Damage')?.value;
              const image = `https://admin.demwitches.xyz/images/tower/${type.toLowerCase()}.png`;
              return { id, image, type, level, speed, range, damage };
            } catch (err) {
              console.warn(`⚠️ Failed to load metadata for Tower #${id}`, err);
              return {
                id,
                image: 'https://admin.demwitches.xyz/images/tower/unknown.png',
                type: 'Unknown',
                level: 1
              };
            }
          })
        );
        setTowers(towersWithMetadata);
      } catch (err) {
        console.error('❌ Failed to fetch towers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTowers();
  }, [walletAddress]);
  const toggleExpand = (id: number) => {
    const newSet = new Set(expandedSet);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSet(newSet);
  };
  useEffect(() => {
    const handler = async (e: any) => {
      const tokenId = e.detail.tokenId;
  
      try {
        const txHash = await upgradeTower(tokenId);
        console.log('✅ Upgrade TX confirmed:', txHash);
  
        // Wait a few seconds to be safe
        await new Promise((r) => setTimeout(r, 3000));
  
        // 🔄 Read new level from contract
        const provider = new JsonRpcProvider('https://rpc.apechain.com');
        const towerContract = new Contract('0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec', DENG_TOWER_ABI.abi, provider);
        const level = await towerContract.getTowerLevel(tokenId);
  
        console.log(`🎯 Token #${tokenId} upgraded to level ${level}`);

        // 🧠 Send to metadata server
const towerType = towers.find(t => t.id === tokenId)?.type || 'Unknown';
const res = await fetch(`https://metadata-server-production.up.railway.app/generate-metadata/${tokenId}`, {
  method: 'POST',
  headers: {
    'x-metadata-secret': import.meta.env.VITE_METADATA_SECRET!,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ type: towerType, level })
});

  
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server returned ${res.status}: ${text}`);
        }
  
        console.log(`📁 Metadata regenerated for tower #${tokenId} → Lv${level}`);
  
        window.dispatchEvent(
          new CustomEvent("show-success-modal", {
            detail: {
              message: `🎉 Tower #${tokenId} upgraded to Level ${level}!<br /><a href="https://apescan.io/tx/${txHash}" target="_blank">View on ApeScan</a>`
            }
          })
        );
      } catch (err: any) {
        console.error('❌ Upgrade process failed:', err);
        window.dispatchEvent(
          new CustomEvent("show-error-modal", {
            detail: { message: err.message || 'Upgrade failed.' }
          })
        );
      }
    };
  
    window.addEventListener("trigger-upgrade", handler);
    return () => window.removeEventListener("trigger-upgrade", handler);
  }, []);
  return (
    <div id="profile-modal" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div id="profile-overlay" onClick={onClose} />
      <div
  id="profile-card"
  style={{
    width: '90%',
    maxWidth: towers.length === 0 ? '500px' : '60vw',
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
    fontFamily: 'Outfit',
    color: '#00B3FF',
    textShadow: '0 0 2px #00B3FF, 0 0 4px #00B3FF',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: '16px'
  }}
>
  My Towers
</h2>
        {loading ? (
          <p style={{ color: '#fff' }}>Loading towers...</p>
        ) : towers.length === 0 ? (
            <p
            style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: '1.1rem',
              marginTop: '12px'
            }}
          >You don’t own any towers yet. What did you do? Who hurt you?</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginTop: '12px'
            }}
          >
            {towers.map((tower) => {
              const isExpanded = expandedSet.has(tower.id);
              return (
                <div
                key={tower.id}
                onClick={() => toggleExpand(tower.id)}
                style={{
                  background: '#1A1F2B',
                  border: '1px solid #3CDFFF',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignSelf: 'start',
                  cursor: 'pointer'
                }}
              >
              
              
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '12px',
                      background: '#6daed4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}
                  >
                    <img
                      src={tower.image}
                      alt={`Tower #${tower.id}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#00B3FF', fontWeight: 'bold' }}>
  #{tower.id}
  <a
    href={`https://magiceden.io/item-details/apechain/${TOWER_CONTRACT}/${tower.id}`}
    target="_blank"
    rel="noopener noreferrer"
    title="View on Magic Eden"
    style={{ display: 'inline-flex' }}
  >
    <img src="https://admin.demwitches.xyz/images/me-icon.png" alt="ME" style={{ width: '16px', height: '16px', marginTop: '2px'}} />
  </a>
  <a
    href={`https://opensea.io/item/ape_chain/${TOWER_CONTRACT}/${tower.id}`}
    target="_blank"
    rel="noopener noreferrer"
    title="View on OpenSea"
    style={{ display: 'inline-flex' }}
  >
    <img src="https://admin.demwitches.xyz/images/os-logo.png" alt="OS" style={{ width: '18px', height: '16px',marginTop: '2px' }} />
  </a>
</div>
                  <div style={{ position: 'relative', marginTop: '4px' }}>
  {/* Centered Type + Level Text */}
  <div
    style={{
      textAlign: 'center',
      fontSize: '14px',
      color: '#5CFFA3'
    }}
  >
    {tower.type} • Lv {tower.level}
  </div>

  {/* Bottom-Right Toggle Button */}
  <button
  onClick={(e) => {
    e.stopPropagation(); // ⛔ Prevents bubble up to the card's onClick
    toggleExpand(tower.id);
  }}
  style={{
    position: 'absolute',
    right: '4px',
    bottom: '-4px',
    background: 'transparent',
    border: 'none',
    color: '#ccc',
    fontSize: '14px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    outline: 'none'
  }}
  onMouseDown={(e) => e.preventDefault()}
  >
    {isExpanded ? '▲' : '▼'}
  </button>
</div>
              {isExpanded && (
  <div
    style={{
      marginTop: '10px',
      background: '#0F121A',
      border: '1px solid #3CDFFF',
      borderRadius: '10px',
      padding: '12px',
      color: '#D0EFFF',
      fontSize: '13px',
      boxShadow: '0 0 12px rgba(60, 223, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      🔹 <strong>Speed:</strong> {tower.speed}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      🔹 <strong>Range:</strong> {tower.range}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      🔹 <strong>Damage:</strong> {tower.damage}
    </div>
    <button
  onClick={async () => {
    if (!address) {
      window.dispatchEvent(
        new CustomEvent("show-error-modal", {
          detail: { message: `❌ No connected wallet.` }
        })
      );
      return;
    }

    const tokenId = tower.id;

    try {
      // 🛠️ Call on-chain upgradeTower function
      const txHash = await upgradeTower(tokenId);
      console.log("✅ upgradeTower() tx:", txHash);

      // ⏳ Give the chain a few seconds
      await new Promise((r) => setTimeout(r, 3000));

      // 🔁 Read new level
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(TOWER_CONTRACT, DENG_TOWER_ABI.abi, provider);
      const levelBigInt = await contract.getTowerLevel(tokenId);
      const level = Number(levelBigInt);      
      const type = tower.type;

      console.log(`🔍 Tower #${tokenId} is now level ${level}`);

      // 🧠 Send to metadata generator
      const numericType = type === "Basic" ? 0 : type === "Cannon" ? 1 : type === "Rapid" ? 2 : -1;
      if (numericType === -1) {
        throw new Error(`❌ Invalid tower type for token #${tokenId}`);
      }
      
      const res = await fetch(`https://metadata-server-production.up.railway.app/generate-metadata/${tokenId}`, {
        method: 'POST',
        headers: {
          'x-metadata-secret': import.meta.env.VITE_METADATA_SECRET!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: numericType, level })
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Metadata server error: ${text}`);
      }

      console.log(`📁 Metadata updated for #${tokenId}`);

      // 🎉 Show success modal
      window.dispatchEvent(
        new CustomEvent("show-success-modal", {
          detail: {
            message: `🎉 Tower #${tokenId} upgraded to Level ${level}!<br /><a href="https://apescan.io/tx/${txHash}" target="_blank">View on ApeScan</a>`
          }
        })
      );

      // 🔄 Optional: refresh UI
      setTimeout(() => window.location.reload(), 1500);

    } catch (err: any) {
      console.error("❌ Upgrade failed:", err);
      window.dispatchEvent(
        new CustomEvent("show-error-modal", {
          detail: { message: err.message || 'Upgrade failed.' }
        })
      );
    }
  }}
  className="glow-button green"
>
  🛠️ Upgrade to Lv {tower.level + 1}
</button>
  </div>
)}
                </div>
              );
            })}
          </div>
        )}
        <div className="button-row" style={{ marginTop: '20px' }}>
          <button className="glow-button danger" onClick={onClose}>❌ Close</button>
        </div>
      </div>
    </div>
  );
}
