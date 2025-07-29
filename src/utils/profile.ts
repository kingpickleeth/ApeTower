import { supabase } from '../lib/supabaseClient';
import { JsonRpcProvider, Contract } from 'ethers';

export async function getProfile(walletAddress: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('wallet_address', walletAddress)
    .single();

  if (error) console.error('Error fetching profile:', error);
  return data;
}

export async function upsertProfile(walletAddress: string, username: string, pfpUrl: string, bio: string) {
    console.log('Upserting profile:', { walletAddress, username, pfpUrl, bio });
  
    const { data, error } = await supabase.from('profiles').upsert(
      [
        {
          wallet_address: walletAddress,
          username,
          pfp_url: pfpUrl,
          bio
        }
      ],
      {
        onConflict: 'wallet_address'
      }
    );
  
    if (error) {
      console.error('Error saving profile:', error);
      return { error }; // ✅ return the error to caller
    }
  
    console.log('Upsert succeeded:', data);
    return { data }; // ✅ optional but useful
  }
  export async function upgradeCampaignLevel(walletAddress: string, targetLevel: number) {
  try {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('campaign_level')
      .ilike('wallet_address', walletAddress)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching campaign level:', fetchError);
      return { error: fetchError };
    }

    const currentLevel = data?.campaign_level ?? 1;

    if (currentLevel >= targetLevel) {
      console.log(`✅ campaign_level already ${currentLevel}, no update needed.`);
      return { data: currentLevel };
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ campaign_level: targetLevel })
      .ilike('wallet_address', walletAddress);

    if (updateError) {
      console.error('❌ Error updating campaign_level:', updateError);
      return { error: updateError };
    }

    console.log(`🚀 campaign_level upgraded: ${currentLevel} ➡️ ${targetLevel}`);
    return { data: targetLevel };
  } catch (e) {
    console.error('🔥 Exception in upgradeCampaignLevel:', e);
    return { error: e };
  }
}

  export async function updateVineBalance(walletAddress: string, vineEarned: number) {
    try {
      // 🧠 Step 1: Fetch current total_vine
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_vine')
        .ilike('wallet_address', walletAddress)
        .single();
  
      if (fetchError) {
        console.error('❌ Error fetching profile for vine update:', fetchError);
        return { error: fetchError };
      }
  
      const currentBalance = Number(profile?.total_vine ?? 0);
      const newBalance = currentBalance + vineEarned;


  
      // 💾 Step 2: Update total_vine
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_vine: newBalance })
        .ilike('wallet_address', walletAddress);
  
      if (updateError) {
        console.error('❌ Error updating vine balance:', updateError);
        return { error: updateError };
      }
  
      console.log(`🌿 $VINE updated: ${currentBalance} ➡️ ${newBalance}`);
      return { data: newBalance };
    } catch (e) {
      console.error('🔥 Exception in updateVineBalance:', e);
      return { error: e };
    }
  }
  const DENG_TOWER_ABI = ['function balanceOf(address) view returns (uint256)'];
  const DENG_TOWER_ADDRESS = '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec';

export async function checkTowerBalance(walletAddress: string): Promise<number> {
  const provider = new JsonRpcProvider("https://apechain.calderachain.xyz/http");
  const contract = new Contract(DENG_TOWER_ADDRESS, DENG_TOWER_ABI, provider);
  const balance = await contract.balanceOf(walletAddress);
  return Number(balance);
}
export const getProfileByUsername = async (username: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, wallet_address')
    .eq('username', username)
    .single(); // or remove `.single()` if it causes issues

  if (error) {
    console.error('❌ getProfileByUsername error:', error);
    return null;
  }

  console.log("👤 getProfileByUsername result:", data);
  return data;
};

  
  