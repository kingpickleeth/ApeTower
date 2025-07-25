import { useEffect, useState } from 'react';
import { JsonRpcProvider, Contract } from 'ethers';
import DENG_TOWER_ABI from '../abis/Tower.json';

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

  return (
    <div id="profile-modal" style={{ fontFamily: "'Outfit', sans-serif" }}>
  
      <div id="profile-overlay" onClick={onClose} />
      <div
  id="profile-card"
  style={{
    width: '90%',
    maxWidth: towers.length === 0 ? '600px' : '70vw',
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
      disabled
      style={{
        width: '100%',
        padding: '10px 0',
        borderRadius: '8px',
        border: '1px solid #3a3a3a',
        background: 'linear-gradient(145deg, #1F242F, #181C26)',
        color: '#777',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'not-allowed',
        opacity: 0.8,
        letterSpacing: '0.4px',
        boxShadow:
          'inset 0 1px 1px rgba(255,255,255,0.04), inset 0 -1px 2px rgba(0,0,0,0.3)'
      }}
    >
      🛠️ Upgrade (Coming Soon)
    </button>
  </div>
)}


                </div>
              );
            })}
          </div>
        )}
        <div className="button-row" style={{ marginTop: '20px' }}>
          <button className="close-btn" onClick={onClose}>❌ Close</button>
        </div>
      </div>
    </div>
  );
}
