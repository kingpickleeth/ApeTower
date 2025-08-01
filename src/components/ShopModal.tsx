import React, { useState } from 'react';
import { useWalletClient, useAccount, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { buyMoo } from '../utils/buyMoo';
import { useTowerContract } from '../utils/contracts';
import { usePublicClient } from 'wagmi';
import ERC20_ABI from '../abis/ERC20.json';
import { useEffect } from 'react';
import { updateVineBalance, getProfile } from '../utils/profile'; // ✅ If not already present
import { JsonRpcProvider, Contract } from 'ethers';
import DENG_TOWER_ABI from '../abis/Tower.json'; // ✅ Update path if needed
import { parseUnits } from 'viem'; // ✅ add this at the top if not already

const MOO_ADDRESS = '0x932b8eF025c6bA2D44ABDc1a4b7CBAEdb5DE1582';
const TOWER_CONTRACT = '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec';
const MAX_UINT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
interface Props {
  walletAddress: string;
  onClose: () => void;
}


export default function ShopModal({ walletAddress, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'towers' | 'moo'>('towers');
  const publicClient = usePublicClient();
  const [mooBalance, setMooBalance] = useState(BigInt(0));
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [apeBalance, setApeBalance] = useState(BigInt(0));
  const [vineBalance, setVineBalance] = useState<number>(0); // ✅ if not already in scope
  const [buyingMooAmount, setBuyingMooAmount] = useState<number | null>(null);
  const [buyingTowerId, setBuyingTowerId] = useState<number | null>(null);
  const towerItems = [
    {
      type: 'Basic',
      typeId: 0,
      image: 'https://admin.demwitches.xyz/images/tower/basic.png',
      cost: '50 $MOO',
      price: 50n * 10n ** 18n,
      description: 'Reliable and balanced.',
      stats: { speed: 3, range: 4, damage: 3 }
    },
    {
      type: 'Rapid',
      typeId: 2, // ✅ Correct ID for Rapid
      image: 'https://admin.demwitches.xyz/images/tower/rapid.png',
      cost: '100 $MOO',
      price: 100n * 10n ** 18n,
      description: 'High speed, lower damage.',
      stats: { speed: 5, range: 3, damage: 2 }
    },
    {
      type: 'Cannon',
      typeId: 1, // ✅ Correct ID for Cannon
      image: 'https://admin.demwitches.xyz/images/tower/cannon.png',
      cost: '200 $MOO',
      price: 200n * 10n ** 18n,
      description: 'Massive damage, slow fire rate.',
      stats: { speed: 1, range: 4, damage: 5 }
    }
  ];
  
  const mooBundles = [
    {
      amount: 50,
      cost: '0.25 $APE',
      price: parseEther('0.25'),
      image: 'https://admin.demwitches.xyz/images/MooBundle.png'
    },
    {
      amount: 100,
      cost: '0.5 $APE',
      price: parseEther('0.5'),
      image: 'https://admin.demwitches.xyz/images/MooBundle3.png'
    },
    {
      amount: 200,
      cost: '1 $APE',
      price: parseEther('1'),
      image: 'https://admin.demwitches.xyz/images/MooBundle5.png'
    }
  ];
  
  const { data: walletClient } = useWalletClient();
  const towerContract = useTowerContract(); // ✅ SAFE hook call
  useEffect(() => {
    const fetchProfileBalance = async () => {
      const profile = await getProfile(walletAddress);
      if (profile?.total_vine != null) {
        setVineBalance(profile.total_vine);
      }
    };
  
    if (walletAddress) {
      fetchProfileBalance();
    }
  }, [walletAddress]);

  const handleBuyMoo = async (amountEth: string, amountMoo: number) => {
    if (!walletClient) {
      window.dispatchEvent(new CustomEvent("show-error-modal", {
        detail: { message: '❌ Please connect your wallet.' }
      }));
      return;
    }
  
    const amountInWei = parseEther(amountEth);
    setBuyingMooAmount(amountMoo); // 🔁 show loading
  
    try {
      const tx = await buyMoo({ walletClient, amount: amountInWei });
      console.log('MOO purchase TX:', tx);
  
      window.dispatchEvent(new CustomEvent("show-success-modal", {
        detail: { message: `🎉 $MOO purchase submitted. Waiting for confirmation...` }
      }));
  
      await publicClient?.waitForTransactionReceipt({ hash: tx });
  
      window.dispatchEvent(new CustomEvent("show-success-modal", {
        detail: { message: `🦛 You successfully bought ${amountMoo} $MOO!` }
      }));
  
      await fetchMooBalance(); // 🟢 refresh balance
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-error-modal", {
        detail: { message: '❌ $MOO purchase failed. Please try again.' }
      }));
    } finally {
      setBuyingMooAmount(null); // ✅ reset button
    }
  };
  
  const { address } = useAccount();
  const { writeContractAsync: write } = useWriteContract();
// 👇 Add this above your component body (inside the component but outside useEffect)
const fetchMooBalance = async () => {
  if (!publicClient || !address) return;

  try {
    const balance = await publicClient.readContract({
      address: MOO_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
    setMooBalance(balance as bigint);
  } catch (err) {
    console.error('Failed to fetch $MOO balance:', err);
  } finally {
    setLoadingBalance(false);
  }
};
const fetchApeBalance = async () => {
  if (!publicClient || !address) return;

  try {
    const balance = await publicClient.getBalance({ address });
    setApeBalance(balance);
  } catch (err) {
    console.error('Failed to fetch $APE balance:', err);
  }
};

// Fetch on mount
useEffect(() => {
  fetchMooBalance();
  fetchApeBalance(); // ✅ fetch APE too
}, [publicClient, address]);


  
const RPC = 'https://rpc.apechain.com'; // ✅ Confirm this is your current RPC

const handleBuyTower = async (towerType: number) => {
  if (!walletClient || !towerContract || !address || !publicClient) {
    return alert('Wallet or contract not ready');
  }

  const mooCosts = ['50', '100', '200'];
  const cost = parseEther(mooCosts[towerType]);
  setBuyingTowerId(towerType);

  try {
    // ✅ 1. Check allowance
    const allowance = await publicClient.readContract({
      address: MOO_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [address, TOWER_CONTRACT],
    });

    if ((allowance as bigint) < cost) {
      const approveTx = await write({
        address: MOO_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TOWER_CONTRACT, MAX_UINT],
      });

      window.dispatchEvent(new CustomEvent("show-success-modal", {
        detail: { message: `🧾 Approval submitted. Waiting for confirmation...` }
      }));      
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
      if (approvalReceipt.status !== 'success') throw new Error('Approval failed');
    }
    const txHash = await towerContract.write.buyTower([towerType]);
    window.dispatchEvent(new CustomEvent("show-success-modal", {
      detail: { message: `🎉 Tower minted successfully!` }
    }));    
    
    // 💤 Wait for Metamask to return and browser to stabilize
    await new Promise((r) => setTimeout(r, 2500));
    
    // 🧠 Optional: poll tower contract for owned towers
    
    // ✅ 4. Fetch owned towers
    const ethersProvider = new JsonRpcProvider(RPC);
    const ethersContract = new Contract(TOWER_CONTRACT, DENG_TOWER_ABI.abi, ethersProvider);
    const ownedIds: bigint[] = await ethersContract.getOwnedTowers(address);

    const newestId = Math.max(...ownedIds.map(id => Number(id)));
    console.log(`🆕 Newest tower ID: ${newestId}`);

    // ✅ 5. Trigger metadata generation
    const res = await fetch(`https://metadata-server-production.up.railway.app/generate-metadata/${newestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-metadata-secret': import.meta.env.VITE_METADATA_SECRET!,
      },
      body: JSON.stringify({ type: towerType }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Metadata failed: ${res.status} - ${text}`);
    }

    console.log(`📁 Metadata generated for tower #${newestId}`);

    // ✅ 6. Refresh balance
    await fetchMooBalance();
    setBuyingTowerId(null);
  } catch (err) {
    console.error(err);
    window.dispatchEvent(new CustomEvent("show-error-modal", {
      detail: { message: `❌ Tower purchase failed. Please try again.` }
    }));  setBuyingTowerId(null);
  
  }
};


  const handleClaim = async () => {
    if (vineBalance <= 0 || !walletAddress || !walletClient || !towerContract) return;
  
    const expiry = Math.floor(Date.now() / 1000) + 300;
  
    try {
      const response = await fetch("https://metadata-server-production.up.railway.app/api/sign-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, amount: vineBalance, expiry })
      });
  
      const { signature, error } = await response.json();
      if (!signature || error) {
        console.error("❌ Signature fetch failed:", error);
        return;
      }
      const claimAmount = parseUnits(vineBalance.toString(), 18);

      const tx = await towerContract.write.claim([
        claimAmount,
        BigInt(expiry),
        signature
      ]);
  
      console.log("🎉 Claim TX:", tx);
  
      const supabaseResult = await updateVineBalance(walletAddress, -vineBalance);
      if (supabaseResult?.error) {
        console.error("❌ Supabase reset failed:", supabaseResult.error);
      } else {
        setVineBalance(0);
        await fetchMooBalance(); // ✅ update real balance after claiming
      }
  
    } catch (err) {
      console.error("❌ Claim failed:", err);
    }
  };
  
  if (vineBalance > 0) {
    return (
      <div id="profile-modal" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div id="profile-overlay" onClick={onClose} />
        <div
          id="profile-card"
          style={{
            width: '90%',
            maxWidth: '500px',
            padding: '20px',
            background: '#0D1117',
            borderRadius: '16px',
            boxShadow: '0 0 24px rgba(0,255,163,0.1)',
            border: '2px solid #5CFFA3',
            color: '#fff',
            textAlign: 'center'
          }}
        >
          <h2 style={{ fontSize: '2rem', color: '#5CFFA3', marginBottom: '16px' }}>
            🦛 First, Claim Your $MOO 🦛
          </h2>
          <p style={{ fontSize: '1rem', marginBottom: '24px' }}>
  You have <strong>{vineBalance}</strong> unclaimed $MOO. You must claim it before you run off and start buying shit!
</p>

<button
  onClick={handleClaim}
  className="glow-button green"
  style={{ width: '100%', maxWidth: '175px', margin: '0 auto' }}
>
  Claim {vineBalance} $MOO
</button>

          <div className="button-row" style={{ marginTop: '20px' }}>
            <button className="glow-button danger" onClick={onClose}>
              ❌ No Thanks, Claim Later
            </button>
          </div>
        </div>
      </div>
    );
  }
  
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
          color: '#fff',
          position: 'relative' // 👈 Add this line!
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
        <div
  style={{
    position: 'absolute',
    top: '16px',
    right: '16px',
    padding: '4px 10px',
    fontSize: 'clamp(0.75rem, 2.5vw, 1.05rem)',
    fontWeight: 600,
    color: '#5CFFA3',
    maxWidth: '45%',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }}
>
  {activeTab === 'towers'
    ? `Balance: ${(Number(mooBalance) / 1e18).toFixed(0)} $MOO`
    : `Balance: ${(Number(apeBalance) / 1e18).toFixed(1)} $APE`}
</div>


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
    🦛 Buy $MOO
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
<p style={{ fontSize: '0.95rem', marginBottom: '8px',marginTop:'8px' }}>{tower.description}</p>
                <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                  🔹 <strong>Speed:</strong> {tower.stats.speed} <br />
                  🔹 <strong>Range:</strong> {tower.stats.range} <br />
                  🔹 <strong>Damage:</strong> {tower.stats.damage}
                </div>
                {Number(mooBalance) < Number(tower.price) ? (
  <>
    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#FF4D4F' }}>
      Cost: {tower.cost}
    </div>
    <button
      className="glow-button danger"
      disabled
      style={{ opacity: 0.6, cursor: 'not-allowed' }}
    >
      Not Enough $MOO
    </button>
  </>
) : (
  <>
    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#5CFFA3' }}>
      Cost: {tower.cost}
    </div>
    <button
  className="glow-button green"
  disabled={buyingTowerId === tower.typeId}
  onClick={() => handleBuyTower(tower.typeId)}
>
  {buyingTowerId === tower.typeId ? '⏳ Buying...' : 'Buy / Mint'}
</button>


  </>
)}
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
                {apeBalance < bundle.price ? (
  <>
    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#FF4D4F' }}>
      {bundle.cost}
    </div>
    <button
      className="glow-button danger"
      disabled
      style={{ opacity: 0.6, cursor: 'not-allowed' }}
    >
      Not Enough $APE
    </button>
  </>
) : (
  <>
    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#5CFFA3' }}>
      {bundle.cost}
    </div>
    <button
  className="glow-button green"
  disabled={buyingMooAmount === bundle.amount}
  onClick={() => handleBuyMoo(bundle.cost.split(' ')[0], bundle.amount)}
>
  {buyingMooAmount === bundle.amount ? '⏳ Buying...' : 'Buy'}
</button>

  </>
)}
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
